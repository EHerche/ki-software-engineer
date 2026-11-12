import { CommonModule } from '@angular/common';
import { afterNextRender, Component, ElementRef, inject, Input, Injector, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, map, Observable, of, startWith, Subject, switchMap, tap, timer } from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';
import { BookCoverComponent } from './book-cover.component';
import { BookPreviewComponent } from './book-preview.component';

type BookListState = { status: 'loading' | 'error'; books: null } | { status: 'loaded'; books: Book[] };
type SearchAction = { searchTerm: string; debounce: boolean };

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BookItemComponent, BookPreviewComponent, BookCoverComponent],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly injector = inject(Injector);
  private readonly searchActions = new Subject<SearchAction>();

  @Input() pageSize = 10;
  @ViewChild('rouletteButton') private rouletteButton?: ElementRef<HTMLButtonElement>;
  searchTerm = '';
  selectedBook: Book | null = null;
  rouletteBook = false;
  rouletteRunning = false;
  rouletteStatus = '';
  rouletteMotionOverride = false;
  availableBooks: Book[] = [];
  cubeBooks: Book[] = [];
  private pendingRouletteBook: Book | null = null;
  private animateRoulette = true;
  private lastRouletteBookId?: string;
  private selectedElement?: HTMLElement;

  readonly state$: Observable<BookListState> = this.searchActions.pipe(
    startWith({ searchTerm: '', debounce: false }),
    // Switch before delaying so new input also cancels an active HTTP request immediately.
    tap(() => {
      this.cancelRoulette();
      this.availableBooks = [];
      this.cubeBooks = [];
      this.closePreview(false);
    }),
    switchMap(({ searchTerm, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => this.bookApiClient.getBooks(this.pageSize, searchTerm)),
        map((books): BookListState => ({ status: 'loaded', books })),
        tap(state => {
          this.availableBooks = state.status === 'loaded' ? state.books : [];
          this.setCubeBooks(this.availableBooks);
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

  startRoulette(event?: Event, animate = this.animateRoulette): void {
    if (this.rouletteRunning || !this.availableBooks.length) return;
    this.animateRoulette = animate;

    const trigger = event?.currentTarget;
    const returnElement = trigger instanceof HTMLElement ? trigger : this.selectedElement;
    this.closePreview(false);
    this.rouletteMotionOverride = animate;
    this.selectedElement = returnElement;
    this.pendingRouletteBook = this.randomBook(this.availableBooks, this.lastRouletteBookId);
    if (!this.pendingRouletteBook) return;
    // The result is fixed before rolling so the front face and preview always agree.
    this.setCubeBooks([
      this.pendingRouletteBook,
      ...this.availableBooks.filter(book => book.id !== this.pendingRouletteBook?.id)
    ]);
    this.rouletteRunning = true;
    this.rouletteStatus = 'Choosing a book...';
    if (!animate) this.finishRoulette();
  }

  onRouletteAnimationEnd(event: AnimationEvent): void {
    if (event.target === event.currentTarget && event.animationName.endsWith('roulette-roll')) {
      this.finishRoulette();
    }
  }

  private finishRoulette(): void {
    if (!this.rouletteRunning) return;
    const book = this.pendingRouletteBook;
    if (!book) {
      this.cancelRoulette();
      return;
    }

    this.lastRouletteBookId = book.id;
    this.pendingRouletteBook = null;
    this.rouletteRunning = false;
    this.rouletteMotionOverride = false;
    this.rouletteBook = true;
    this.selectedBook = book;
    this.rouletteStatus = `This book chose you: ${book.title}.`;
    afterNextRender(
      () => {
        document.querySelector<HTMLElement>('.book-preview button')?.focus();
      },
      { injector: this.injector }
    );
  }

  private cancelRoulette(): void {
    this.rouletteRunning = false;
    this.rouletteMotionOverride = false;
    this.pendingRouletteBook = null;
    this.rouletteStatus = '';
  }

  private setCubeBooks(books: Book[]): void {
    this.cubeBooks = books.length ? Array.from({ length: 6 }, (_, index) => books[index % books.length]) : [];
  }

  private randomBook(books: Book[], excludedId?: string): Book | null {
    const candidates = excludedId && books.length > 1 ? books.filter(book => book.id !== excludedId) : books;
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  trackById(_index: number, book: Book): string {
    return book.id;
  }

  openPreview(book: Book, event: Event): void {
    this.cancelRoulette();
    this.rouletteBook = false;
    this.rouletteStatus = '';
    this.selectedBook = book;
    this.selectedElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    afterNextRender(
      () => {
        document.querySelector<HTMLElement>('.book-preview button')?.focus();
      },
      { injector: this.injector }
    );
  }

  closePreview(restoreFocus = true): void {
    if (!this.selectedBook) return;
    const element = this.selectedElement;
    this.selectedBook = null;
    this.rouletteBook = false;
    this.selectedElement = undefined;
    if (restoreFocus) {
      afterNextRender(() => (element?.isConnected ? element : this.rouletteButton?.nativeElement)?.focus(), {
        injector: this.injector
      });
    }
  }
}
