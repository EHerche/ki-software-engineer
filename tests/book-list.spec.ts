import { apiUrl, booksResponse, expect, firstBook, secondBook, test } from './fixtures/books';
import { BooksPage } from './pages/books.page';

const listRequest = (url: string) => url.startsWith(`${apiUrl}?`);

test.describe('Critical collection journeys', () => {
  test('title search and Clear restore the collection', async ({ page }) => {
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
    await test.step('When clearing the search', async () => {
      await books.clearSearch();
    });
    await test.step('Then the complete collection returns', async () => {
      await expect(books.searchInput).toHaveValue('');
      await expect(books.bookLink(firstBook.title)).toBeVisible();
      await expect(books.bookLink(secondBook.title)).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  });
});

test('recovers from a failed collection load with Retry', async ({ page }) => {
  let requests = 0;
  await page.route(`${apiUrl}?*`, route => {
    requests++;
    if (requests === 1) {
      return route.fulfill({ status: 503, json: {} });
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
