import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Book } from './book';

export type BookChanges = Pick<
  Book,
  'title' | 'subtitle' | 'author' | 'publisher' | 'numPages' | 'price' | 'cover' | 'abstract'
>;

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

  getBooks(pageSize: number = 10, searchTerm?: string): Observable<Book[]> {
    let params = new HttpParams().set('_limit', pageSize.toString());

    if (searchTerm) {
      // Search in title and author fields
      params = params.set('q', searchTerm);
    }

    return this.http.get<Book[]>(this.apiUrl, { params });
  }
}
