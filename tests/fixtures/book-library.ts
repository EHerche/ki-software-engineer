import type { Page } from '@playwright/test';
import type { Book } from '../../src/app/books/book';
import type { CreateBookInput } from '../../src/app/books/book-api-client.service';
import { apiUrl, firstBook, fulfillBooksPage } from './books';

// A fresh in-memory library per test; deliberately not a live-backend contract test.
export async function mockBookLibrary(page: Page, initial: Book[] = []) {
  const library = new Map(initial.map(book => [book.id, { ...book }]));
  const writes: { method: string; body: unknown }[] = [];
  let sequence = 0;
  await page.route(/^http:\/\/localhost:4730\/books(?:\?.*|\/[^/?]+)?$/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname === '/books' ? undefined : decodeURIComponent(url.pathname.slice('/books/'.length));
    if (request.method() === 'GET') {
      if (id === undefined) return fulfillBooksPage(route, [...library.values()]);
      const book = library.get(id);
      return route.fulfill({ status: book ? 200 : 404, json: book ?? {} });
    }
    if (request.method() === 'POST' && id === undefined) {
      const body = request.postDataJSON() as CreateBookInput;
      writes.push({ method: 'POST', body });
      let createdId: string;
      do {
        createdId = `created-${++sequence}`;
      } while (library.has(createdId));
      const book: Book = { ...body, id: createdId, userId: firstBook.userId };
      library.set(createdId, book);
      return route.fulfill({ status: 201, json: book });
    }
    if (request.method() === 'PUT' && id !== undefined) {
      if (!library.has(id)) return route.fulfill({ status: 404, json: {} });
      const body = request.postDataJSON() as Book;
      writes.push({ method: 'PUT', body });
      library.set(id, body);
      return route.fulfill({ json: body });
    }
    return route.fulfill({ status: 405, json: {} });
  });
  return { writes };
}
