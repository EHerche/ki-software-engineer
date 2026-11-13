import { BooksPage } from './pages/books.page';
import { BookDetailsPage } from './pages/book-details.page';
import { apiUrl, expect, firstBook, secondBook, test } from './fixtures/books';

test('searches the collection, opens details by keyboard, and returns to the collection', async ({ page }) => {
  const books = new BooksPage(page);
  const detailsPage = new BookDetailsPage(page);
  await test.step('Given a loaded collection', async () => {
    await books.goto();
    await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  });
  await test.step('When searching and opening a title with the keyboard', async () => {
    await page.getByPlaceholder('Search for books...').fill('Angular');
    await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toHaveCount(0);

    const bookLink = page.getByRole('link', { name: firstBook.title, exact: true });
    await expect(bookLink).toHaveAttribute('href', `/books/${firstBook.id}?searchText=Angular`);
    await bookLink.focus();
    await page.keyboard.press('Enter');
  });
  await test.step('Then all details and the cover are displayed', async () => {
    await expect(page).toHaveURL(`/books/${firstBook.id}?searchText=Angular`);
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
  });
  await test.step('When returning to the collection', async () => {
    await detailsPage.back();
  });
  await test.step('Then the search and matching results are retained', async () => {
    await expect(page).toHaveURL('/?searchText=Angular');
    await expect(page.getByRole('heading', { name: 'Book Collection' })).toBeVisible();
    await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Search for books...')).toHaveValue('Angular');
  });
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
