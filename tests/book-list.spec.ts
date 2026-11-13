import type { Page } from '@playwright/test';
import type { Book } from '../src/app/books/book';
import { apiUrl, booksResponse, expect, firstBook, secondBook, test } from './fixtures/books';
import { BooksPage } from './pages/books.page';

test.describe('Book collection user journeys', () => {
  test('Given books exist, When opening the collection, Then their titles are visible', async ({ page }) => {
    const books = new BooksPage(page);
    await test.step('Given two books in the mocked collection', async () => {
      await books.goto();
    });
    await test.step('When the collection is displayed', async () => {
      await expect(books.heading).toBeVisible();
    });
    await test.step('Then both books can be opened', async () => {
      await expect(books.bookLink(firstBook.title)).toHaveText(firstBook.title);
      await expect(books.bookLink(firstBook.title)).toBeVisible();
      await expect(books.bookLink(secondBook.title)).toBeVisible();
    });
  });

  for (const clearWith of ['button', 'empty input'] as const) {
    test(`Given a title search, When clearing with ${clearWith}, Then all books return`, async ({ page }) => {
      const books = new BooksPage(page);
      await test.step('Given a loaded collection with two books', async () => {
        await books.goto();
        await expect(books.bookLink(firstBook.title)).toBeVisible();
        await expect(books.bookLink(secondBook.title)).toBeVisible();
      });
      await test.step('When searching by title', async () => {
        await books.searchByTitle('Angular');
      });
      await test.step('Then only the matching title is visible', async () => {
        await expect(books.bookLink(firstBook.title)).toBeVisible();
        await expect(books.bookLink(secondBook.title)).toHaveCount(0);
      });
      await test.step(`When clearing the search with ${clearWith}`, async () => {
        if (clearWith === 'button') await books.clearSearch();
        else await books.searchInput.fill('');
      });
      await test.step('Then the complete collection returns', async () => {
        await expect(books.searchInput).toHaveValue('');
        await expect(books.bookLink(firstBook.title)).toBeVisible();
        await expect(books.bookLink(secondBook.title)).toBeVisible();
        await expect(page.getByRole('alert')).toHaveCount(0);
      });
    });
  }

  test('Given a collection, When opening a title, Then its details are shown', async ({ page }) => {
    const books = new BooksPage(page);
    await test.step('Given a loaded collection', async () => {
      await books.goto();
      await expect(books.bookLink(firstBook.title)).toBeVisible();
    });
    await test.step('When opening the first title', async () => {
      await books.openBook(firstBook.title);
    });
    await test.step('Then the matching details route and title are displayed', async () => {
      await expect(page).toHaveURL(`/books/${firstBook.id}`);
      await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
    });
  });

  test('Given a collection, When choosing Add book, Then the creation form opens', async ({ page }) => {
    const books = new BooksPage(page);
    await test.step('Given the collection page', async () => {
      await books.goto();
      await expect(books.heading).toBeVisible();
    });
    await test.step('When choosing Add book', async () => {
      await books.addBook();
    });
    await test.step('Then the creation route and form are displayed', async () => {
      await expect(page).toHaveURL('/books/new');
      await expect(page.getByRole('textbox', { name: 'Title *', exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Title *', exact: true })).toHaveValue('');
    });
  });
});

const listRequest = (url: string) => url.startsWith(`${apiUrl}?`);

async function openCollectionWithPausedClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-10T08:00:00Z') });
  await page.goto('/');
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-10T09:00:00Z'));
}

test('shows initial loading and sends the default page size before rendering results', async ({ page }) => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}?*`, async route => {
    expect(new URL(route.request().url()).searchParams.get('_limit')).toBe('10');
    await ready;
    await route.fulfill(booksResponse([firstBook]));
  });

  try {
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('Loading books...');
    await expect(page.getByText('No books available', { exact: true })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

for (const search of ['', 'unknown']) {
  test(`shows a successful empty ${search ? 'search' : 'collection'}`, async ({ page }) => {
    await page.route(`${apiUrl}?*`, route => route.fulfill(booksResponse([])));
    await page.goto('/');
    if (search) {
      await page.getByPlaceholder('Search for books...').fill(search);
    }
    await expect(
      page.getByText(search ? 'No books match your search' : 'No books available', { exact: true })
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    if (search) {
      await page.getByRole('button', { name: 'Clear Search', exact: true }).click();
      await expect(page.getByText('No books available', { exact: true })).toBeVisible();
    }
  });
}

for (const failure of ['server', 'network'] as const) {
  test(`recovers from an initial ${failure} failure with immediate retry`, async ({ page }) => {
    let requests = 0;
    await page.route(`${apiUrl}?*`, route => {
      requests++;
      if (requests === 1) {
        return failure === 'network' ? route.abort('failed') : route.fulfill({ status: 503, json: {} });
      }
      return route.fulfill(booksResponse([firstBook]));
    });
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText('Unable to load books');
    await expect(page.getByText('No books available', { exact: true })).toHaveCount(0);
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const retried = page.waitForRequest(request => listRequest(request.url()));
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await retried;
    await page.clock.resume();
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(requests).toBe(2);
  });
}

test('clears old results on a failed search and accepts a later search', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route => {
    const query = new URL(route.request().url()).searchParams.get('q');
    return query === 'fail'
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill(booksResponse(query ? [secondBook] : [firstBook]));
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  await page.getByPlaceholder('Search for books...').fill('fail');
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toHaveCount(0);
  await expect(page.getByText('No books match your search', { exact: true })).toHaveCount(0);
  await page.getByPlaceholder('Search for books...').fill('TypeScript');
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('debounces rapid typing for 300 ms and sends only the latest search', async ({ page }) => {
  const queries: string[] = [];
  page.on('request', request => {
    if (listRequest(request.url())) queries.push(new URL(request.url()).searchParams.get('q') ?? '');
  });
  await openCollectionWithPausedClock(page);
  const input = page.getByPlaceholder('Search for books...');
  await input.fill('Ang');
  await page.clock.runFor(200);
  await input.fill('Angular');
  await page.clock.runFor(299);
  expect(queries).toEqual(['']);
  await expect(page.getByRole('status')).toBeVisible();
  const requested = page.waitForRequest(request => listRequest(request.url()) && request.url().includes('q=Angular'));
  await page.clock.runFor(1);
  await requested;
  await page.clock.resume();
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toHaveCount(0);
  expect(queries).toEqual(['', 'Angular']);
});

test('clear cancels a pending debounce and reloads immediately without a duplicate request', async ({ page }) => {
  const queries: string[] = [];
  page.on('request', request => {
    if (listRequest(request.url())) queries.push(new URL(request.url()).searchParams.get('q') ?? '');
  });
  await openCollectionWithPausedClock(page);
  await page.getByPlaceholder('Search for books...').fill('Angular');
  await page.clock.runFor(200);
  const cleared = page.waitForRequest(request => listRequest(request.url()));
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await cleared;
  await page.clock.runFor(1000);
  expect(queries).toEqual(['', '']);
  await page.clock.resume();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search for books...')).toHaveValue('');
});

for (const action of ['search', 'clear', 'navigate'] as const) {
  test(`${action} cancels an active request before any debounce and ignores its late response`, async ({ page }) => {
    let release!: () => void;
    const ready = new Promise<void>(resolve => (release = resolve));
    const slowUrl = `${apiUrl}?_limit=10&q=slow&_page=1`;
    await page.route(slowUrl, async route => {
      await ready;
      await route.fulfill(booksResponse([{ ...firstBook, title: 'Stale response' }]));
    });
    await openCollectionWithPausedClock(page);
    const input = page.getByPlaceholder('Search for books...');
    await input.fill('slow');
    const requested = page.waitForRequest(slowUrl);
    await page.clock.runFor(300);
    await requested;
    const cancelled = page.waitForEvent('requestfailed', request => request.url() === slowUrl);
    try {
      if (action === 'search') {
        await input.fill('TypeScript');
      } else if (action === 'clear') {
        await page.getByRole('button', { name: 'Clear search', exact: true }).click();
      } else {
        await page.evaluate(path => {
          history.pushState({}, '', path);
          dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
        }, `/books/${secondBook.id}`);
        await page.clock.runFor(20);
      }
      // Cancellation must precede the next search's 300 ms delay.
      await cancelled;
      if (action === 'search') await page.clock.runFor(300);
    } finally {
      release();
    }
    await page.clock.resume();
    if (action === 'navigate') {
      await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
    }
    await expect(page.getByText('Stale response', { exact: true })).toHaveCount(0);
  });
}

test('navigation destroys the pending search timer', async ({ page }) => {
  const queries: string[] = [];
  page.on('request', request => {
    if (listRequest(request.url())) queries.push(new URL(request.url()).searchParams.get('q') ?? '');
  });
  await openCollectionWithPausedClock(page);
  await page.getByPlaceholder('Search for books...').fill('Angular');
  await page.evaluate(path => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  }, `/books/${secondBook.id}`);
  await page.clock.runFor(1000);
  expect(queries).toEqual(['']);
  await page.clock.resume();
  await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
});

for (const cover of ['missing', 'broken'] as const) {
  test(`cards handle a ${cover} cover`, async ({ page }) => {
    await page.route(`${apiUrl}?*`, route =>
      route.fulfill(booksResponse([{ ...firstBook, cover: cover === 'missing' ? '' : firstBook.cover }]))
    );
    await page.route('http://localhost:4730/covers/**', route => route.abort());
    await page.goto('/');
    await expect(page.locator('.book-shelf').getByText('No cover available', { exact: true })).toBeVisible();
    await expect(page.getByRole('img')).toHaveCount(0);
  });
}

test('a reused cover recovers when its parent supplies a new cover input', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route => route.fulfill(booksResponse([firstBook])));
  await page.route(firstBook.cover, route => route.abort());
  await page.goto('/');
  await expect(page.locator('.book-shelf').getByText('No cover available', { exact: true })).toBeVisible();
  const cover = await page.locator('app-book-item app-book-cover').elementHandle();
  // Exercise the presentation input contract through its parent using Angular's dev-only debug API.
  await page.locator('app-book-item').evaluate((element, replacementCover) => {
    const angular = (
      window as unknown as {
        ng: {
          getComponent(element: Element): { book(): Book };
          applyChanges(component: object): void;
        };
      }
    ).ng;
    const card = angular.getComponent(element);
    card.book().cover = replacementCover;
    angular.applyChanges(card);
  }, 'http://localhost:4730/covers/recovered.svg');
  await expect(page.getByRole('img', { name: `Cover of ${firstBook.title}` })).toBeVisible();
  await expect(page.locator('.book-shelf').getByText('No cover available', { exact: true })).toHaveCount(0);
  expect(await cover!.evaluate(element => element.isConnected)).toBe(true);
});
