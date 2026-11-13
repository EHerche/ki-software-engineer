import type { Book } from '../src/app/books/book';

// Independent from Playwright: no browser fixture or backend is imported here.
export const sampleBook: Book = {
  id: 'sample-book',
  isbn: '9781234567890',
  title: 'Angular in Practice',
  subtitle: 'A useful guide',
  author: 'Ada Reader',
  publisher: 'Example Press',
  numPages: 320,
  price: 'EUR 29.95',
  cover: 'https://example.invalid/cover.svg',
  abstract: 'An introduction to building applications.',
  userId: 7
};

export const sampleDraft = {
  isbn: sampleBook.isbn,
  title: sampleBook.title,
  subtitle: sampleBook.subtitle ?? '',
  author: sampleBook.author,
  publisher: sampleBook.publisher,
  numPages: sampleBook.numPages,
  price: sampleBook.price,
  cover: sampleBook.cover,
  abstract: sampleBook.abstract
};
