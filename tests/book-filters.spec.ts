import { apiUrl, expect, firstBook, secondBook, test } from './fixtures/books';

for (const field of ['title', 'author', 'isbn']) {
  test(`searches only the selected ${field} field and escapes literal input`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
    await page.getByLabel('Search in', { exact: true }).selectOption(field);
    const requested = page.waitForRequest(request => {
      const url = new URL(request.url());
      return url.pathname === '/books' && url.searchParams.has(`${field}_like`);
    });
    await page.getByPlaceholder('Search for books...').fill('Ada [Reader].');
    const params = new URL((await requested).url()).searchParams;
    expect(params.get(`${field}_like`)).toBe('Ada \\[Reader\\]\\.');
    expect(params.has('q')).toBe(false);
    expect(params.get('_limit')).toBe('10');
  });
}

test('combines publisher, full text and sorting, retains filters on retry and resets all', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has('publisher_like')) return route.fulfill({ status: 503, json: {} });
    return route.fulfill({ json: [firstBook, secondBook] });
  });
  await page.goto('/');
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  await page.getByPlaceholder('Search for books...').fill(' Angular ');
  await page.getByLabel('Sort by', { exact: true }).selectOption('title-desc');
  await page.getByLabel('Publisher', { exact: true }).fill(' Example Press ');
  await expect(page.getByRole('alert')).toBeVisible();
  const retried = page.waitForRequest(request => request.url().startsWith(`${apiUrl}?`));
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const params = new URL((await retried).url()).searchParams;
  expect(params.get('q')).toBe('Angular');
  expect(params.get('publisher_like')).toBe('Example Press');
  expect(params.get('_sort')).toBe('title');
  expect(params.get('_order')).toBe('desc');
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search for books...')).toHaveValue('');
  await expect(page.getByLabel('Publisher', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Search in', { exact: true })).toHaveValue('all');
  await expect(page.getByLabel('Sort by', { exact: true })).toHaveValue('default');
  await expect(page.getByRole('button', { name: 'Reset filters', exact: true })).toBeDisabled();
});

test('publisher-only empty results offer recovery and clearing search keeps other filters', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: params.has('publisher_like') ? [] : [firstBook] });
  });
  await page.goto('/');
  await page.getByLabel('Publisher', { exact: true }).fill('Unknown');
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search for books...').fill('Angular');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.getByLabel('Publisher', { exact: true })).toHaveValue('Unknown');
  await expect(page.getByText('No books match your search', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
});

for (const [option, field, order] of [
  ['title-asc', 'title', 'asc'],
  ['title-desc', 'title', 'desc'],
  ['author-asc', 'author', 'asc'],
  ['pages-asc', 'numPages', 'asc'],
  ['pages-desc', 'numPages', 'desc']
]) {
  test(`sort ${option} requests sorted results immediately`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
    await page.clock.install();
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const requested = page.waitForRequest(request => new URL(request.url()).searchParams.has('_sort'));
    await page.getByLabel('Sort by', { exact: true }).selectOption(option);
    const params = new URL((await requested).url()).searchParams;
    expect(params.get('_sort')).toBe(field);
    expect(params.get('_order')).toBe(order);
    await page.clock.resume();
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`filters fit mobile and remain usable in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.getByLabel('Search in', { exact: true }).selectOption('author');
    await page.getByLabel('Publisher', { exact: true }).fill('Press');
    await page.getByLabel('Sort by', { exact: true }).selectOption('pages-asc');
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tmp/book-filters-${theme}-mobile.png`, fullPage: true });
  });
}
