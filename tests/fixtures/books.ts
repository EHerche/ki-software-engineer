import { test as base, type Route, type Page } from '@playwright/test';
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

export const paginationBooks: Book[] = Array.from({ length: 23 }, (_, index) => ({
  ...firstBook,
  id: `page-book-${String(index + 1).padStart(2, '0')}`,
  title: `Match Book ${String(index + 1).padStart(2, '0')}`,
  author: 'Target Author',
  publisher: 'Target Press',
  numPages: index + 1
}));

// Explicit response metadata: tests using an override must supply the server's count too.
export const booksResponse = (books: Book[], total = books.length) => ({
  json: books,
  headers: { 'X-Total-Count': String(total), 'Access-Control-Expose-Headers': 'X-Total-Count' }
});

export async function fulfillBooksPage(route: Route, books: Book[]): Promise<void> {
  if (route.request().method() !== 'GET') return route.fallback();
  const params = new URL(route.request().url()).searchParams;
  const query = params.get('q')?.toLowerCase();
  let matches = books.filter(book => !query || Object.values(book).join(' ').toLowerCase().includes(query));
  for (const field of ['title', 'author', 'isbn', 'publisher'] as const) {
    const pattern = params.get(`${field}_like`);
    if (pattern) matches = matches.filter(book => new RegExp(pattern, 'i').test(book[field]));
  }
  const fields = params.get('_sort')?.split(',') ?? [];
  const orders = params.get('_order')?.split(',') ?? [];
  matches.sort((a, b) => {
    for (const [index, field] of fields.entries()) {
      const left = a[field as keyof Book];
      const right = b[field as keyof Book];
      const compared =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      if (compared) return compared * (orders[index] === 'desc' ? -1 : 1);
    }
    return 0;
  });
  const size = Number(params.get('_limit') ?? 10);
  const start = (Number(params.get('_page') ?? 1) - 1) * size;
  await route.fulfill(booksResponse(matches.slice(start, start + size), matches.length));
}

export async function mockBooksPages(page: Page, books = paginationBooks): Promise<void> {
  await page.route(`${apiUrl}?*`, route => fulfillBooksPage(route, books));
  await page.route(`${apiUrl}/*`, route => {
    if (route.request().method() !== 'GET') return route.fallback();
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!);
    const book = books.find(candidate => candidate.id === id);
    return route.fulfill({ status: book ? 200 : 404, json: book ?? {} });
  });
}

export const test = base.extend({
  baseURL: 'http://localhost:4200',
  page: async ({ page }, use) => {
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.route(/^http:\/\/localhost:4730\/books(?:\?.*)?$/, route => {
      if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: {} });
      return fulfillBooksPage(route, [firstBook, secondBook]);
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
