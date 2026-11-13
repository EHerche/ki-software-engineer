import {
  apiUrl,
  booksResponse,
  expect,
  fulfillBooksPage,
  mockBooksPages,
  paginationBooks,
  test
} from './fixtures/books';
import { BooksPage } from './pages/books.page';
import { BookDetailsPage } from './pages/book-details.page';

const context = 'page=2&searchText=Match&searchField=title&publisher=Target&sort=pages-asc';
const collectionRequest = (url: string) => url.startsWith(`${apiUrl}?`);

test.describe('Pagination across preview and details', () => {
  test('returns to the same filtered page after preview and cancelling an edit', async ({ page }) => {
    const books = new BooksPage(page);
    const details = new BookDetailsPage(page);
    const selected = paginationBooks[10];
    await test.step('Given the second page of a filtered collection', async () => {
      await mockBooksPages(page);
      await page.goto(`/?${context}`);
      await expect(books.pagination.status).toHaveText('Page 2 of 3');
      await expect(books.bookLink(selected.title)).toBeVisible();
    });
    await test.step('When opening a preview and continuing to details', async () => {
      await books.preview.open(selected.title);
      await expect(books.preview.heading).toHaveText(selected.title);
      await books.preview.openDetails();
      await expect(details.heading).toHaveText(selected.title);
      await expect(books.preview.dialog).toHaveCount(0);
    });
    await test.step('When changing a title and cancelling the edit', async () => {
      await details.edit();
      await details.editor.fill({ title: 'Discard this draft' });
      await details.editor.cancel();
    });
    await test.step('Then the original title and collection context survive reload and return', async () => {
      await expect(details.heading).toHaveText(selected.title);
      await page.reload();
      await expect(details.heading).toHaveText(selected.title);
      await details.back();
      await expect(page).toHaveURL(`/?${context}`);
      await expect(books.pagination.status).toHaveText('Page 2 of 3');
      await expect(books.bookLink(selected.title)).toBeVisible();
      await expect(books.filters.search).toHaveValue('Match');
      await expect(books.filters.field).toHaveValue('title');
      await expect(books.filters.publisher).toHaveValue('Target');
      await expect(books.filters.sort).toHaveValue('pages-asc');
      await expect(books.bookLink('Discard this draft')).toHaveCount(0);
    });
    await test.step('When going to the last page and back', async () => {
      await books.pagination.next();
      await expect(books.pagination.status).toHaveText('Page 3 of 3');
      await expect(books.pagination.nextButton).toBeDisabled();
      await books.pagination.previous();
      await expect(books.pagination.status).toHaveText('Page 2 of 3');
    });
  });
});

test('AC-13 / pages and boundaries use filtered server total', async ({ page }) => {
  await mockBooksPages(page);
  await page.goto('/');
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('app-book-item')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('link', { name: paginationBooks[10].title, exact: true })).toBeVisible();
  await expect(page.locator('app-book-item')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('app-book-item')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(page.getByRole('link', { name: paginationBooks[10].title, exact: true })).toBeVisible();
});

for (const action of ['search', 'field', 'publisher', 'sort', 'clear', 'reset'] as const) {
  test(`AC-14 / ${action} resets page and preserves other criteria`, async ({ page }) => {
    await mockBooksPages(page);
    await page.goto(`/?${context}`);
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    const requested = page.waitForRequest(request => collectionRequest(request.url()));
    if (action === 'search') await page.getByLabel('Search the collection', { exact: true }).fill('Book');
    if (action === 'field') await page.getByLabel('Search in', { exact: true }).selectOption('all');
    if (action === 'publisher') await page.getByLabel('Publisher', { exact: true }).fill('Press');
    if (action === 'sort') await page.getByLabel('Sort by', { exact: true }).selectOption('title-desc');
    if (action === 'clear') await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    if (action === 'reset') await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
    const params = new URL((await requested).url()).searchParams;
    expect(params.get('_page')).toBe('1');
    expect(params.get('_limit')).toBe('10');
    if (action !== 'reset') {
      expect(params.get('publisher_like')).toBe(action === 'publisher' ? 'Press' : 'Target');
      expect(params.get('_sort')).toBe(action === 'sort' ? 'title,id' : 'numPages,id');
      expect(params.get('_order')).toBe(action === 'sort' ? 'desc,asc' : 'asc,asc');
      if (action !== 'clear')
        expect(params.get(action === 'field' ? 'q' : 'title_like')).toBe(action === 'search' ? 'Book' : 'Match');
      else expect(params.has('title_like')).toBe(false);
    } else expect([...params.keys()]).toEqual(['_limit', '_page']);
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
  });
}

for (const action of ['page', 'search'] as const) {
  test(`AC-15 / ${action} immediately cancels delayed page response`, async ({ page }) => {
    await mockBooksPages(page);
    let release!: () => void;
    const hold = new Promise<void>(resolve => (release = resolve));
    await page.route(`${apiUrl}?*`, async route => {
      if (new URL(route.request().url()).searchParams.get('_page') !== '2') return route.fallback();
      await hold;
      await route.fulfill(booksResponse([{ ...paginationBooks[10], title: 'Stale page' }], 23));
    });
    await page.goto('/');
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    const requested = page.waitForRequest(request => new URL(request.url()).searchParams.get('_page') === '2');
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    const pending = await requested;
    const cancelled = page.waitForEvent('requestfailed', request => request === pending);
    try {
      if (action === 'page') await page.getByRole('button', { name: 'Next page', exact: true }).click();
      else {
        await page.clock.install();
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
        await page.getByLabel('Search the collection', { exact: true }).fill('Book');
      }
      await cancelled;
    } finally {
      release();
    }
    if (action === 'search') {
      await page.clock.runFor(300);
      await page.clock.resume();
    }
    await expect(page.getByText(action === 'page' ? 'Page 3 of 3' : 'Page 1 of 3', { exact: true })).toBeVisible();
    await expect(page.getByText('Stale page', { exact: true })).toHaveCount(0);
  });
}

test('AC-16 / page error hides old books and retries the exact filtered page', async ({ page }) => {
  await mockBooksPages(page);
  let fail = true;
  const urls: string[] = [];
  await page.route(`${apiUrl}?*`, route => {
    if (new URL(route.request().url()).searchParams.get('_page') !== '2') return route.fallback();
    urls.push(route.request().url());
    return fail ? route.fulfill({ status: 500, json: {} }) : route.fallback();
  });
  await page.goto(`/?${context.replace('page=2', 'page=1')}`);
  await expect(page.locator('app-book-item')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  await expect(page.locator('app-book-item')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  expect(urls).toHaveLength(2);
  expect(urls[0]).toBe(urls[1]);
});

test('AC-13 / exact page length with total ten has no next page', async ({ page }) => {
  await mockBooksPages(page, paginationBooks.slice(0, 10));
  await page.goto('/');
  await expect(page.locator('app-book-item')).toHaveCount(10);
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
});

test('AC-17 / empty collection normalizes to page one', async ({ page }) => {
  await mockBooksPages(page, []);
  const pages: string[] = [];
  page.on('request', request => {
    if (collectionRequest(request.url())) pages.push(new URL(request.url()).searchParams.get('_page')!);
  });
  await page.goto('/?page=3');
  await expect(page.getByText('No books available', { exact: true })).toBeVisible();
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible();
  expect(pages).toEqual(['3', '1']);
});

test('AC-17 / shrinking collection corrects once to last valid page', async ({ page }) => {
  await mockBooksPages(page, paginationBooks.slice(0, 11));
  const pages: string[] = [];
  page.on('request', request => {
    if (collectionRequest(request.url())) pages.push(new URL(request.url()).searchParams.get('_page')!);
  });
  await page.goto('/?page=3');
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: paginationBooks[10].title, exact: true })).toBeVisible();
  expect(pages).toEqual(['3', '2']);
  expect(new URL(page.url()).searchParams.get('page')).toBe('2');
});

test('AC-17 / missing count is an error instead of an inferred next page', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route => route.fulfill({ json: paginationBooks.slice(0, 10) }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Unable to load books');
  await expect(page.locator('app-book-item')).toHaveCount(0);
});

for (const way of ['back', 'collection', 'preview'] as const) {
  test(`AC-29 / ${way} and reload restore complete collection context without duplicate reads`, async ({ page }) => {
    await mockBooksPages(page);
    const urls: string[] = [];
    page.on('request', request => {
      if (collectionRequest(request.url())) urls.push(request.url());
    });
    await page.goto(`/?${context}`);
    await expect(page.getByRole('link', { name: paginationBooks[10].title, exact: true })).toBeVisible();
    if (way === 'preview') {
      await page.getByRole('button', { name: `Preview ${paginationBooks[10].title}`, exact: true }).click();
      await page.getByRole('link', { name: 'View details', exact: true }).click();
    } else await page.getByRole('link', { name: paginationBooks[10].title, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(paginationBooks[10].title);
    if (way === 'back') await page.goBack();
    else await page.getByRole('link', { name: 'Back to collection', exact: true }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    expect(urls).toHaveLength(2);
    expect(urls[1]).toBe(urls[0]);
    await page.reload();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Search the collection', { exact: true })).toHaveValue('Match');
    await expect(page.getByLabel('Search in', { exact: true })).toHaveValue('title');
    await expect(page.getByLabel('Publisher', { exact: true })).toHaveValue('Target');
    await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue('pages-asc');
    expect(urls).toHaveLength(3);
    expect(urls[2]).toBe(urls[0]);
  });
}

test('AC-29 / invalid query parameters normalize safely without duplicate requests', async ({ page }) => {
  await mockBooksPages(page);
  const urls: string[] = [];
  page.on('request', request => {
    if (collectionRequest(request.url())) urls.push(request.url());
  });
  await page.goto('/?page=-8&searchField=unsafe&sort=unknown&returnUrl=https://evil.example');
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
  await expect(page).toHaveURL('/');
  expect(urls).toHaveLength(1);
  await expect(page.getByLabel('Search in', { exact: true })).toHaveValue('all');
  await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue('default');
});

test('AC-29 / same-details-route query updates refresh the return link without reloading the book', async ({
  page
}) => {
  await mockBooksPages(page);
  let detailReads = 0;
  page.on('request', request => {
    if (request.url() === `${apiUrl}/${paginationBooks[10].id}`) detailReads++;
  });
  await page.goto(`/books/${paginationBooks[10].id}?${context}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(paginationBooks[10].title);
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set('page', '3');
    history.pushState({}, '', url);
    dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  });
  const back = page.getByRole('link', { name: 'Back to collection', exact: true });
  await expect(back).toHaveAttribute('href', `/?${context.replace('page=2', 'page=3')}`);
  expect(detailReads).toBe(1);
  await back.click();
  await expect(page.getByText('Page 3 of 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Search the collection', { exact: true })).toHaveValue('Match');
});

for (const state of ['preview', 'roll'] as const) {
  test(`AC-18 / page change ends ${state} and no late dialog opens`, async ({ page }) => {
    await mockBooksPages(page);
    await page.goto('/');
    await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
    if (state === 'preview')
      await page.getByRole('button', { name: `Preview ${paginationBooks[0].title}`, exact: true }).click();
    else {
      await page.getByRole('button', { name: 'Überrasche mich!', exact: true }).click();
      await expect(page.locator('.roulette-cube')).toHaveClass(/is-spinning/);
    }
    if (state === 'preview') {
      await expect(page.getByRole('dialog')).toBeVisible();
      // A URL/history page change remains possible while a modal covers the pagination.
      await page.evaluate(() => {
        history.pushState({}, '', '/?page=2');
        dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      });
    } else await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.roulette-cube.is-spinning')).toHaveCount(0);
  });
}

for (const width of [375, 1440])
  for (const theme of ['light', 'dark'] as const) {
    test(`AC-28 / pagination keyboard actions fit ${width}px ${theme}`, async ({ page }, testInfo) => {
      await mockBooksPages(page);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      const next = page.getByRole('button', { name: 'Next page', exact: true });
      await next.focus();
      await expect(next).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
      await expect(next).toBeFocused();
      expect(await next.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('pagination.png'), fullPage: true });
    });
  }
