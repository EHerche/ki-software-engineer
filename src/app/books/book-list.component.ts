import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, map, Observable, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';

type BookListState = { status: 'loading' | 'error'; books: null } | { status: 'loaded'; books: Book[] };
type SearchAction = { searchTerm: string; debounce: boolean };

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BookItemComponent],
  templateUrl: './book-list.component.html'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly searchActions = new Subject<SearchAction>();

  @Input() pageSize = 10;
  searchTerm = '';

  readonly state$: Observable<BookListState> = this.searchActions.pipe(
    startWith({ searchTerm: '', debounce: false }),
    // Switch before delaying so new input also cancels an active HTTP request immediately.
    switchMap(({ searchTerm, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => this.bookApiClient.getBooks(this.pageSize, searchTerm)),
        map((books): BookListState => ({ status: 'loaded', books })),
        catchError(() => of<BookListState>({ status: 'error', books: null })),
        startWith<BookListState>({ status: 'loading', books: null })
      )
    )
  );

  onSearchChange(): void {
    this.searchActions.next({ searchTerm: this.searchTerm, debounce: true });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchActions.next({ searchTerm: '', debounce: false });
  }

  retry(): void {
    this.searchActions.next({ searchTerm: this.searchTerm, debounce: false });
  }

  trackById(_index: number, book: Book): string {
    return book.id;
  }
}
