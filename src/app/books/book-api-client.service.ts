import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Book } from './book';

export type BookChanges = Pick<
  Book,
  'title' | 'subtitle' | 'author' | 'publisher' | 'numPages' | 'price' | 'cover' | 'abstract'
>;

export type CreateBookInput = BookChanges & Pick<Book, 'isbn'>;
export type CreatedBook = Omit<Book, 'userId'> & { userId?: number };

export type BookSearchField = 'all' | 'title' | 'author' | 'isbn';
export type BookSort = 'default' | 'title-asc' | 'title-desc' | 'author-asc' | 'pages-asc' | 'pages-desc';
export interface BookFilters {
  field: BookSearchField;
  publisher: string;
  sort: BookSort;
}

export interface BookPageQuery {
  page: number;
  pageSize: number;
  searchTerm?: string;
  filters?: BookFilters;
}

export interface BookPage {
  books: Book[];
  page: number;
  pageSize: number;
  total: number;
}

// JSON Server's _like accepts a regular expression; search text must remain literal.
const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable({ providedIn: 'root' })
export class BookApiClient {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:4730/books';

  getBook(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }

  createBook(input: CreateBookInput): Observable<CreatedBook> {
    // Creation accepts user fields only; the server supplies its own identity.
    const payload: CreateBookInput = {
      isbn: input.isbn,
      title: input.title,
      subtitle: input.subtitle,
      author: input.author,
      publisher: input.publisher,
      numPages: input.numPages,
      price: input.price,
      cover: input.cover,
      abstract: input.abstract
    };
    return this.http.post<CreatedBook>(this.apiUrl, payload);
  }

  updateBook(book: Book, changes: BookChanges): Observable<Book> {
    // PUT replaces the resource. Copy the original and allow only editable fields to change.
    const updated: Book = {
      ...book,
      title: changes.title,
      subtitle: changes.subtitle,
      author: changes.author,
      publisher: changes.publisher,
      numPages: changes.numPages,
      price: changes.price,
      cover: changes.cover,
      abstract: changes.abstract
    };

    return this.http.put<Book>(`${this.apiUrl}/${encodeURIComponent(book.id)}`, updated);
  }

  getBooks(pageSize: number = 10, searchTerm?: string, filters?: BookFilters): Observable<Book[]> {
    return this.http.get<Book[]>(this.apiUrl, { params: this.collectionParams(pageSize, searchTerm, filters) });
  }

  getBooksPage(query: BookPageQuery): Observable<BookPage> {
    const params = this.collectionParams(query.pageSize, query.searchTerm, query.filters).set('_page', query.page);
    return this.http.get<Book[]>(this.apiUrl, { params, observe: 'response' }).pipe(
      map(response => {
        const header = response.headers.get('X-Total-Count');
        const total = Number(header);
        if (header === null || !/^\d+$/.test(header) || !Number.isSafeInteger(total) || !Array.isArray(response.body)) {
          throw new Error('The collection response requires a valid total count and books array.');
        }
        return { books: response.body, page: query.page, pageSize: query.pageSize, total };
      })
    );
  }

  private collectionParams(pageSize: number, searchTerm?: string, filters?: BookFilters): HttpParams {
    let params = new HttpParams().set('_limit', pageSize.toString());
    const term = searchTerm?.trim();
    const publisher = filters?.publisher.trim();

    if (term) {
      params =
        filters && filters.field !== 'all'
          ? params.set(`${filters.field}_like`, escapePattern(term))
          : params.set('q', term);
    }
    if (publisher) {
      params = params.set('publisher_like', escapePattern(publisher));
    }
    if (filters && filters.sort !== 'default') {
      const sorting: Record<Exclude<BookSort, 'default'>, [string, string]> = {
        'title-asc': ['title', 'asc'],
        'title-desc': ['title', 'desc'],
        'author-asc': ['author', 'asc'],
        'pages-asc': ['numPages', 'asc'],
        'pages-desc': ['numPages', 'desc']
      };
      const [field, order] = sorting[filters.sort];
      params = params.set('_sort', `${field},id`).set('_order', `${order},asc`);
    }

    return params;
  }
}
