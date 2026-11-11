import { CommonModule } from '@angular/common';
import { afterNextRender, Component, DestroyRef, inject, Input, Injector } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';
import { BookPreviewComponent } from './book-preview.component';

type BookListState = { status: 'loading' | 'error'; books: null } | { status: 'loaded'; books: Book[] };
type SearchAction = { searchTerm: string; debounce: boolean };

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BookItemComponent, BookPreviewComponent],
  templateUrl: './book-list.component.html'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly searchActions = new Subject<SearchAction>();
  private readonly rouletteCancellation = new Subject<void>();

  @Input() pageSize = 10;
  searchTerm = '';
  selectedBook: Book | null = null;
  rouletteBook = false;
  rouletteRunning = false;
  rouletteStatus = '';
  rouletteHighlight: Book | null = null;
  availableBooks: Book[] = [];
  private lastRouletteBookId?: string;
  private selectedElement?: HTMLElement;

  readonly state$: Observable<BookListState> = this.searchActions.pipe(
    startWith({ searchTerm: '', debounce: false }),
    // Switch before delaying so new input also cancels an active HTTP request immediately.
    tap(() => {
      this.cancelRoulette();
      this.availableBooks = [];
      this.closePreview(false);
    }),
    switchMap(({ searchTerm, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => this.bookApiClient.getBooks(this.pageSize, searchTerm)),
        map((books): BookListState => ({ status: 'loaded', books })),
        tap(state => {
          this.availableBooks = state.status === 'loaded' ? state.books : [];
        }),
        catchError(() => {
          this.availableBooks = [];
          return of<BookListState>({ status: 'error', books: null });
        }),
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

  startRoulette(event?: Event): void {
    if (this.rouletteRunning || !this.availableBooks.length) return;

    const trigger = event?.currentTarget;
    const returnElement = trigger instanceof HTMLElement ? trigger : this.selectedElement;
    this.closePreview(false);
    this.selectedElement = returnElement;
    this.rouletteRunning = true;
    this.rouletteStatus = 'Choosing a book...';
    this.rouletteHighlight = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finishRoulette();
      return;
    }

    let ticks = 0;
    timer(0, 140)
      .pipe(take(8), takeUntil(this.rouletteCancellation), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.rouletteHighlight = this.randomBook(this.availableBooks);
        ticks++;
        if (ticks === 8) this.finishRoulette();
      });
  }

  private finishRoulette(): void {
    if (!this.rouletteRunning) return;
    const book = this.randomBook(this.availableBooks, this.lastRouletteBookId);
    if (!book) {
      this.cancelRoulette();
      return;
    }

    this.lastRouletteBookId = book.id;
    this.rouletteHighlight = null;
    this.rouletteRunning = false;
    this.rouletteBook = true;
    this.selectedBook = book;
    this.rouletteStatus = `This book chose you: ${book.title}.`;
    this.rouletteCancellation.next();
    afterNextRender(() => {
      document.querySelector<HTMLElement>('.book-preview button')?.focus();
    }, { injector: this.injector });
  }

  private cancelRoulette(): void {
    this.rouletteCancellation.next();
    this.rouletteRunning = false;
    this.rouletteHighlight = null;
    this.rouletteStatus = '';
  }

  private randomBook(books: Book[], excludedId?: string): Book | null {
    const candidates = excludedId && books.length > 1 ? books.filter(book => book.id !== excludedId) : books;
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  trackById(_index: number, book: Book): string {
    return book.id;
  }

  openPreview(book: Book, event: Event): void {
    this.rouletteBook = false;
    this.rouletteStatus = '';
    this.selectedBook = book;
    this.selectedElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    afterNextRender(() => {
      document.querySelector<HTMLElement>('.book-preview button')?.focus();
    }, { injector: this.injector });
  }

  closePreview(restoreFocus = true): void {
    if (!this.selectedBook) return;
    const element = this.selectedElement;
    this.selectedBook = null;
    this.rouletteBook = false;
    this.selectedElement = undefined;
    if (restoreFocus) afterNextRender(() => element?.focus(), { injector: this.injector });
  }
}
