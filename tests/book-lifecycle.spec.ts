import { apiUrl, expect, firstBook, test } from './fixtures/books';
import { mockBookLibrary } from './fixtures/book-library';
import { AppShell } from './pages/app-shell';
import { BookCreatePage } from './pages/book-form.page';
import { BookDetailsPage } from './pages/book-details.page';
import { BooksPage } from './pages/books.page';

test.describe('Book lifecycle across the app', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`create, edit and rediscover a book in ${theme} mode`, async ({ page }) => {
      const books = new BooksPage(page);
      const create = new BookCreatePage(page);
      const details = new BookDetailsPage(page);
      const shell = new AppShell(page);
      const draft = {
        isbn: 'journey-isbn',
        title: 'Journey Book',
        subtitle: 'A new beginning',
        author: 'Journey Author',
        publisher: 'Journey Press',
        numPages: 120,
        price: 'EUR 12.00',
        cover: firstBook.cover,
        abstract: 'Created through the user interface.'
      };
      const updatedTitle = 'Journey Book Revised';
      const updatedAbstract = 'Revised through the user interface.';
      const library = await mockBookLibrary(page);

      await test.step('Given an empty library and a chosen theme', async () => {
        await page.setViewportSize({ width: theme === 'dark' ? 375 : 1440, height: 900 });
        await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' });
        await books.goto();
        await expect(page.getByText('No books available', { exact: true })).toBeVisible();
        await shell.toggleTheme();
        await expect(shell.root).toHaveAttribute('data-theme', theme);
      });
      await test.step('When adding a book from the collection', async () => {
        await books.addBook();
        await expect(create.heading).toBeVisible();
        await create.submit();
        for (const label of ['ISBN *', 'Title *', 'Publisher *', 'Description *']) {
          await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
        }
        await create.fillDraft(draft);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await create.field('title').press('Enter');
      });
      await test.step('Then its details survive a reload with the selected theme', async () => {
        await expect(page).toHaveURL('/books/created-1');
        await expect(details.heading).toHaveText(draft.title);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.reload();
        await expect(details.heading).toHaveText(draft.title);
        await expect(details.article.getByText(draft.abstract, { exact: true })).toBeVisible();
        await expect(shell.root).toHaveAttribute('data-theme', theme);
      });
      await test.step('When editing and saving the book', async () => {
        await details.edit();
        await expect(details.editor.field('title')).toHaveValue(draft.title);
        await expect(details.editor.isbn).toHaveValue(draft.isbn);
        await details.editor.fill({ title: updatedTitle, abstract: updatedAbstract });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await details.editor.submit();
      });
      await test.step('Then the revised details survive reload and return to the collection', async () => {
        await expect(details.heading).toHaveText(updatedTitle);
        await page.reload();
        await expect(details.heading).toHaveText(updatedTitle);
        await expect(details.article.getByText(updatedAbstract, { exact: true })).toBeVisible();
        await details.back();
        await expect(books.titleLinks).toHaveText([updatedTitle]);
        await expect(books.bookLink(draft.title)).toHaveCount(0);
      });
      await test.step('When searching and reopening the revised book', async () => {
        const searched = page.waitForResponse(response => {
          const url = new URL(response.url());
          return url.origin + url.pathname === apiUrl && url.searchParams.get('title_like') === 'Revised';
        });
        await books.searchByTitle('Revised');
        await searched;
        await expect(books.titleLinks).toHaveText([updatedTitle]);
        await books.openBook(updatedTitle);
      });
      await test.step('Then identity, content, theme and one write per action are retained', async () => {
        await expect(details.heading).toHaveText(updatedTitle);
        await expect(details.article.getByText(draft.isbn, { exact: true })).toBeVisible();
        await expect(details.article.getByText(updatedAbstract, { exact: true })).toBeVisible();
        await expect(shell.root).toHaveAttribute('data-theme', theme);
        expect(library.writes).toEqual([
          { method: 'POST', body: draft },
          {
            method: 'PUT',
            body: {
              ...draft,
              id: 'created-1',
              userId: firstBook.userId,
              title: updatedTitle,
              abstract: updatedAbstract
            }
          }
        ]);
      });
    });
  }
});
