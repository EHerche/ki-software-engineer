import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Book } from './book';

export type BookChanges = Pick<
  Book,
  'title' | 'subtitle' | 'author' | 'publisher' | 'numPages' | 'price' | 'cover' | 'abstract'
>;

export type BookSearchField = 'all' | 'title' | 'author' | 'isbn';
export type BookSort = 'default' | 'title-asc' | 'title-desc' | 'author-asc' | 'pages-asc' | 'pages-desc';
export interface BookFilters {
  field: BookSearchField;
  publisher: string;
  sort: BookSort;
}

// JSON Server's _like accepts a regular expression; search text must remain literal.
const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable({ providedIn: 'root' })
export class BookApiClient {
  private readonly apiUrl = 'http://localhost:4730/books';

  constructor(private http: HttpClient) {}

  getBook(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.apiUrl}/${encodeURIComponent(id)}`);
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
      params = params.set('_sort', field).set('_order', order);
    }

    return this.http.get<Book[]>(this.apiUrl, { params });
  }
}
