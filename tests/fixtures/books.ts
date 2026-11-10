import { test as base } from '@playwright/test';
export { expect } from '@playwright/test';
import type { Book } from '../../src/app/books/book';

export const apiUrl = 'http://localhost:4730/books';
export const firstBook: Book = {
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
export const secondBook: Book = {
  ...firstBook,
  id: 'second-book',
  title: 'Practical TypeScript',
  isbn: '9781234567891'
};

export const test = base.extend({
  baseURL: 'http://localhost:4200',
  page: async ({ page }, use) => {
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
    await use(page);
  }
});
