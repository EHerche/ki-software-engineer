import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  computed,
  signal,
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  viewChild,
  input
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import {
  catchError,
  filter,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import { Book } from './book';
import { BookApiClient, BookFilters, BookSearchField, BookSort } from './book-api-client.service';
import { BookItemComponent } from './book-item.component';
import { BookCoverComponent } from './book-cover.component';
import { BookPreviewComponent } from './book-preview.component';

type BookListState = { status: 'loading' | 'error'; books: null } | { status: 'loaded'; books: Book[] };
type SearchAction = { searchTerm: string; debounce: boolean; filters?: BookFilters };

@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, ReactiveFormsModule, BookItemComponent, BookPreviewComponent, BookCoverComponent],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly searchActions = new Subject<SearchAction>();

  readonly pageSize = input(10);
  private readonly rouletteButton = viewChild<ElementRef<HTMLButtonElement>>('rouletteButton');
  readonly filters = inject(FormBuilder).nonNullable.group({
    searchTerm: '',
    searchField: 'all' as BookSearchField,
    publisher: '',
    sort: 'default' as BookSort
  });
  protected readonly filterValues = toSignal(
    merge(this.filters.valueChanges, this.searchActions).pipe(map(() => this.filters.getRawValue())),
    {
      initialValue: this.filters.getRawValue()
    }
  );
  readonly hasFilters = computed(() => {
    const { searchTerm, publisher, searchField, sort } = this.filterValues();
    return !!(searchTerm || publisher || searchField !== 'all' || sort !== 'default');
  });
  readonly selectedBook = signal<Book | null>(null);
  readonly rouletteBook = signal(false);
  readonly rouletteRunning = signal(false);
  readonly rouletteStatus = signal('');
  readonly rouletteMotionOverride = signal(false);
  readonly availableBooks = signal<Book[]>([]);
  private readonly cubeCandidates = signal<Book[]>([]);
  readonly cubeBooks = computed(() => {
    const books = this.cubeCandidates();
    return books.length ? Array.from({ length: 6 }, (_, index) => books[index % books.length]) : [];
  });
  private pendingRouletteBook: Book | null = null;
  private animateRoulette = true;
  private lastRouletteBookId?: string;
  private selectedElement?: HTMLElement;

  readonly state$: Observable<BookListState> = merge(
    this.searchActions,
    merge(this.filters.controls.searchTerm.valueChanges, this.filters.controls.publisher.valueChanges).pipe(
      map(() => this.searchAction(true))
    ),
    merge(this.filters.controls.searchField.valueChanges, this.filters.controls.sort.valueChanges).pipe(
      map(() => this.searchAction(false))
    )
  ).pipe(
    startWith<SearchAction>({ searchTerm: '', debounce: false }),
    // Switch before delaying so new input also cancels an active HTTP request immediately.
    tap(() => {
      this.cancelRoulette();
      this.availableBooks.set([]);
      this.cubeCandidates.set([]);
      this.closePreview(false);
    }),
    switchMap(({ searchTerm, debounce, filters }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => this.bookApiClient.getBooks(this.pageSize(), searchTerm, filters)),
        map((books): BookListState => ({ status: 'loaded', books })),
        tap(state => {
          this.availableBooks.set(state.status === 'loaded' ? state.books : []);
          this.setCubeBooks(this.availableBooks());
        }),
        catchError(() => {
          this.availableBooks.set([]);
          return of<BookListState>({ status: 'error', books: null });
        }),
        startWith<BookListState>({ status: 'loading', books: null }),
        // Lazy routes keep this screen alive while their chunk loads; cancel work as navigation begins.
        takeUntil(this.router.events.pipe(filter(event => event instanceof NavigationStart)))
      )
    )
  );

  resetFilters(): void {
    this.filters.reset(undefined, { emitEvent: false });
    this.searchActions.next(this.searchAction(false));
  }

  private searchAction(debounce: boolean): SearchAction {
    const { searchTerm, searchField, publisher, sort } = this.filters.getRawValue();
    return { searchTerm, debounce, filters: { field: searchField, publisher, sort } };
  }

  clearSearch(): void {
    this.filters.controls.searchTerm.setValue('', { emitEvent: false });
    this.searchActions.next(this.searchAction(false));
  }

  retry(): void {
    this.searchActions.next(this.searchAction(false));
  }

  startRoulette(event?: Event, animate = this.animateRoulette): void {
    if (this.rouletteRunning() || !this.availableBooks().length) return;
    this.animateRoulette = animate;

    const trigger = event?.currentTarget;
    const returnElement = trigger instanceof HTMLElement ? trigger : this.selectedElement;
    this.closePreview(false);
    this.rouletteMotionOverride.set(animate);
    this.selectedElement = returnElement;
    this.pendingRouletteBook = this.randomBook(this.availableBooks(), this.lastRouletteBookId);
    if (!this.pendingRouletteBook) return;
    // The result is fixed before rolling so the front face and preview always agree.
    this.setCubeBooks([
      this.pendingRouletteBook,
      ...this.availableBooks().filter(book => book.id !== this.pendingRouletteBook?.id)
    ]);
    this.rouletteRunning.set(true);
    this.rouletteStatus.set('Choosing a book...');
    if (!animate) this.finishRoulette();
  }

  onRouletteAnimationEnd(event: AnimationEvent): void {
    if (event.target === event.currentTarget && event.animationName.endsWith('roulette-roll')) {
      this.finishRoulette();
    }
  }

  private finishRoulette(): void {
    if (!this.rouletteRunning()) return;
    const book = this.pendingRouletteBook;
    if (!book) {
      this.cancelRoulette();
      return;
    }

    this.lastRouletteBookId = book.id;
    this.pendingRouletteBook = null;
    this.rouletteRunning.set(false);
    this.rouletteMotionOverride.set(false);
    this.rouletteBook.set(true);
    this.selectedBook.set(book);
    this.rouletteStatus.set(`This book chose you: ${book.title}.`);
    afterNextRender(
      () => {
        document.querySelector<HTMLElement>('.book-preview button')?.focus();
      },
      { injector: this.injector }
    );
  }

  private cancelRoulette(): void {
    this.rouletteRunning.set(false);
    this.rouletteMotionOverride.set(false);
    this.pendingRouletteBook = null;
    this.rouletteStatus.set('');
  }

  private setCubeBooks(books: Book[]): void {
    this.cubeCandidates.set(books);
  }

  private randomBook(books: Book[], excludedId?: string): Book | null {
    const candidates = excludedId && books.length > 1 ? books.filter(book => book.id !== excludedId) : books;
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  openPreview(book: Book, event: Event): void {
    this.cancelRoulette();
    this.rouletteBook.set(false);
    this.rouletteStatus.set('');
    this.selectedBook.set(book);
    this.selectedElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    afterNextRender(
      () => {
        document.querySelector<HTMLElement>('.book-preview button')?.focus();
      },
      { injector: this.injector }
    );
  }

  closePreview(restoreFocus = true): void {
    if (!this.selectedBook()) return;
    const element = this.selectedElement;
    this.selectedBook.set(null);
    this.rouletteBook.set(false);
    this.selectedElement = undefined;
    if (restoreFocus) {
      afterNextRender(() => (element?.isConnected ? element : this.rouletteButton()?.nativeElement)?.focus(), {
        injector: this.injector
      });
    }
  }
}
