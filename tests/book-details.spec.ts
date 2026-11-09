import { expect, test } from '@playwright/test';
import type { Book } from '../src/app/books/book';

const apiUrl = 'http://localhost:4730/books';
const firstBook: Book = {
  id: 'first-book',
  isbn: '9781234567890',
  title: 'Angular in Practice',
  subtitle: 'Building useful applications',
  author: 'Ada Reader',
  publisher: 'Example Press',
  numPages: 320,
  price: 'EUR 29.95',
  cover: 'http://localhost:4730/covers/first.svg',
  abstract: 'A complete introduction to application development.\nThe final paragraph must also be displayed.',
  userId: 1
};
const secondBook: Book = { ...firstBook, id: 'second-book', title: 'Practical TypeScript', isbn: '9781234567891' };

test.use({ baseURL: 'http://localhost:4200' });

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route(`${apiUrl}?*`, route => {
    const query = new URL(route.request().url()).searchParams.get('q')?.toLowerCase() ?? '';
    return route.fulfill({ json: [firstBook, secondBook].filter(book => book.title.toLowerCase().includes(query)) });
  });
  await page.route(`${apiUrl}/*`, route => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!);
    const book = [firstBook, secondBook].find(candidate => candidate.id === id);
    return route.fulfill({ status: book ? 200 : 404, json: book ?? {} });
  });
  await page.route('http://localhost:4730/covers/**', route =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#dbeafe"/></svg>'
    })
  );
});

test('searches the collection, opens details by keyboard, and returns to the collection', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await page.getByPlaceholder('Search for books...').fill('Angular');
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toHaveCount(0);

  const bookLink = page.getByRole('link', { name: firstBook.title, exact: true });
  await expect(bookLink).toHaveAttribute('href', `/books/${firstBook.id}`);
  await bookLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/books/${firstBook.id}`);
  const details = page.getByRole('article', { name: firstBook.title });
  await expect(details).toBeVisible();
  for (const value of [
    firstBook.subtitle!,
    firstBook.author,
    firstBook.isbn,
    firstBook.publisher,
    String(firstBook.numPages),
    firstBook.price
  ]) {
    await expect(details.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(details.getByText(firstBook.abstract)).toBeVisible();
  await expect(page.getByRole('img', { name: `Cover of ${firstBook.title}` })).toBeVisible();

  await page.getByRole('link', { name: 'Back to collection' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Book Collection' })).toBeVisible();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
});

test('loads a direct details link and reloads it without visiting the collection', async ({ page }) => {
  let requests = 0;
  await page.route(`${apiUrl}/${firstBook.id}`, route => {
    requests++;
    return route.fulfill({ json: firstBook });
  });

  await page.goto(`/books/${firstBook.id}`);
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test('shows loading while the details response is pending', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>(resolve => (releaseResponse = resolve));
  await page.route(`${apiUrl}/${firstBook.id}`, async route => {
    await responseReady;
    await route.fulfill({ json: firstBook });
  });

  try {
    await page.goto(`/books/${firstBook.id}`);
    await expect(page.getByRole('status')).toHaveText('Loading book...');
    await expect(page.getByRole('article')).toHaveCount(0);
  } finally {
    releaseResponse();
  }
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('distinguishes an unknown book from a request failure', async ({ page }) => {
  await page.goto('/books/unknown-book');
  await expect(page.getByRole('alert')).toContainText('Book not found');
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to collection' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});

for (const failure of ['server', 'network'] as const) {
  test(`recovers from a ${failure} failure when the user retries`, async ({ page }) => {
    let requests = 0;
    await page.route(`${apiUrl}/${firstBook.id}`, route => {
      requests++;
      if (requests === 1) {
        return failure === 'network' ? route.abort('failed') : route.fulfill({ status: 503, json: {} });
      }
      return route.fulfill({ json: firstBook });
    });

    await page.goto(`/books/${firstBook.id}`);
    await expect(page.getByRole('alert')).toContainText('Unable to load book');
    await expect(page.getByRole('article')).toHaveCount(0);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(requests).toBe(2);
  });
}

for (const cover of ['missing', 'broken'] as const) {
  test(`handles a ${cover} cover and an absent optional subtitle`, async ({ page }) => {
    const { subtitle, ...book } = firstBook;
    await page.route(`${apiUrl}/${firstBook.id}`, route =>
      route.fulfill({ json: { ...book, cover: cover === 'missing' ? '' : firstBook.cover } })
    );
    await page.route('http://localhost:4730/covers/**', route => route.abort());

    await page.goto(`/books/${firstBook.id}`);
    await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
    await expect(page.getByText('No cover available')).toBeVisible();
    await expect(page.getByRole('img')).toHaveCount(0);
    await expect(page.getByText(subtitle!, { exact: true })).toHaveCount(0);
  });
}

test('cancels a pending request when browser history changes the book id', async ({ page }) => {
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>(resolve => (releaseResponse = resolve));
  await page.route(`${apiUrl}/${firstBook.id}`, async route => {
    await responseReady;
    await route.fulfill({ json: firstBook });
  });

  try {
    const firstRequest = page.waitForRequest(`${apiUrl}/${firstBook.id}`);
    await page.goto(`/books/${firstBook.id}`);
    await firstRequest;
    await expect(page.getByRole('status')).toBeVisible();
    const component = await page.locator('app-book-details').elementHandle();

    // Seed adjacent details URLs, then navigate using real browser history.
    await page.evaluate(path => history.pushState({}, '', path), `/books/${secondBook.id}`);
    await page.goBack();
    const cancelledRequest = page.waitForEvent(
      'requestfailed',
      request => request.url() === `${apiUrl}/${firstBook.id}`
    );
    await page.goForward();
    await cancelledRequest;
    await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
    expect(await component!.evaluate(element => element.isConnected)).toBe(true);
    releaseResponse();
    await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toHaveCount(0);

    await page.goBack();
    await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  } finally {
    releaseResponse();
  }
});

test('fits a mobile viewport and keeps the full abstract readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/books/${firstBook.id}`);
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByText(firstBook.abstract)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('book-details-mobile.png'), fullPage: true });
});
