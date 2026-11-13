import { apiUrl, expect, mockBooksPages, paginationBooks, test } from './fixtures/books';
import { BooksPage } from './pages/books.page';
import { BookDetailsPage } from './pages/book-details.page';

const context = 'page=2&searchText=Match&searchField=title&publisher=Target&sort=pages-asc';

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

test('browser Back and reload restore the filtered page without duplicate reads', async ({ page }) => {
  await mockBooksPages(page);
  const urls: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith(`${apiUrl}?`)) urls.push(request.url());
  });
  await page.goto(`/?${context}`);
  const books = new BooksPage(page);
  const details = new BookDetailsPage(page);
  await books.openBook(paginationBooks[10].title);
  await expect(details.heading).toHaveText(paginationBooks[10].title);
  await page.goBack();
  await expect(books.pagination.status).toHaveText('Page 2 of 3');
  expect(urls).toHaveLength(2);
  expect(urls[1]).toBe(urls[0]);
  await page.reload();
  await expect(books.pagination.status).toHaveText('Page 2 of 3');
  await expect(books.filters.search).toHaveValue('Match');
  await expect(books.filters.field).toHaveValue('title');
  await expect(books.filters.publisher).toHaveValue('Target');
  await expect(books.filters.sort).toHaveValue('pages-asc');
  expect(urls).toHaveLength(3);
  expect(urls[2]).toBe(urls[0]);
});
