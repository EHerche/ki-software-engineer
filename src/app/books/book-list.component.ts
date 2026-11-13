import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  computed,
  signal,
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  viewChild,
  input
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationStart, Router, RouterLink } from '@angular/router';
import {
  catchError,
  concatMap,
  finalize,
  filter,
  map,
  merge,
  Observable,
  of,
  range,
  reduce,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import { Book } from './book';
import { BookApiClient, BookPage, BookPageQuery } from './book-api-client.service';
import {
  BookCollectionContext,
  collectionParams,
  readCollectionContext,
  sameCollectionContext
} from './book-collection-query';
import { BookPaginationComponent } from './book-pagination.component';
import { BookItemComponent } from './book-item.component';
import { BookCoverComponent } from './book-cover.component';
import { BookPreviewComponent } from './book-preview.component';

type BookListState = { status: 'loading' | 'error'; books: null } | ({ status: 'loaded' } & BookPage);
type SearchAction = { context: BookCollectionContext; debounce: boolean };

@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    BookItemComponent,
    BookPreviewComponent,
    BookCoverComponent,
    BookPaginationComponent
  ],
  templateUrl: './book-list.component.html',
  styleUrl: './book-list.component.css'
})
export class BookListComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchActions = new Subject<SearchAction>();
  private readonly candidateCancellation = new Subject<void>();
  private readonly context = signal(readCollectionContext(this.route.snapshot.queryParamMap));
  readonly collectionQuery = computed(() => collectionParams(this.context()));
  readonly requestedPage = computed(() => this.context().page);
  readonly knownTotal = signal<number | null>(null);
  private readonly leavingCollection$ = this.router.events.pipe(
    filter((event): event is NavigationStart => event instanceof NavigationStart),
    filter(event => event.url.split(/[?#]/)[0] !== '/')
  );

  readonly pageSize = input(10);
  private readonly rouletteButton = viewChild<ElementRef<HTMLButtonElement>>('rouletteButton');
  readonly filters = inject(FormBuilder).nonNullable.group({
    searchTerm: this.context().searchText,
    searchField: this.context().searchField,
    publisher: this.context().publisher,
    sort: this.context().sort
  });
  protected readonly filterValues = computed(() => ({
    searchTerm: this.context().searchText,
    searchField: this.context().searchField,
    publisher: this.context().publisher,
    sort: this.context().sort
  }));
  readonly hasFilters = computed(() => {
    const { searchTerm, publisher, searchField, sort } = this.filterValues();
    return !!(searchTerm || publisher || searchField !== 'all' || sort !== 'default');
  });
  readonly selectedBook = signal<Book | null>(null);
  readonly rouletteBook = signal(false);
  readonly rouletteRunning = signal(false);
  readonly rouletteLoading = signal(false);
  readonly rouletteError = signal(false);
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
    this.route.queryParamMap.pipe(
      map(readCollectionContext),
      filter(context => !sameCollectionContext(context, this.context())),
      map(context => ({ context, debounce: false }))
    ),
    merge(this.filters.controls.searchTerm.valueChanges, this.filters.controls.publisher.valueChanges).pipe(
      map(() => this.searchAction(true))
    ),
    merge(this.filters.controls.searchField.valueChanges, this.filters.controls.sort.valueChanges).pipe(
      map(() => this.searchAction(false))
    )
  ).pipe(
    startWith<SearchAction>({ context: this.context(), debounce: false }),
    // Switch before delaying so new input also cancels an active HTTP request immediately.
    tap(({ context }) => {
      const previous = this.context();
      if (!sameCollectionContext({ ...previous, page: 1 }, { ...context, page: 1 })) this.knownTotal.set(null);
      this.context.set(context);
      this.filters.setValue(
        {
          searchTerm: context.searchText,
          searchField: context.searchField,
          publisher: context.publisher,
          sort: context.sort
        },
        { emitEvent: false }
      );
      this.writeCollectionUrl(context);
      this.cancelRoulette();
      this.availableBooks.set([]);
      this.cubeCandidates.set([]);
      this.closePreview(false);
    }),
    switchMap(({ context, debounce }) =>
      (debounce ? timer(300) : of(0)).pipe(
        switchMap(() => this.loadPage(context)),
        map((page): BookListState => ({ status: 'loaded', ...page })),
        tap(state => {
          if (state.status === 'loaded') this.knownTotal.set(state.total);
          this.availableBooks.set(state.status === 'loaded' ? state.books : []);
          this.setCubeBooks(this.availableBooks());
        }),
        catchError(() => {
          this.availableBooks.set([]);
          return of<BookListState>({ status: 'error', books: null });
        }),
        startWith<BookListState>({ status: 'loading', books: null }),
        // Lazy routes keep this screen alive while their chunk loads; cancel work as navigation begins.
        takeUntil(this.leavingCollection$)
      )
    )
  );

  ngOnInit(): void {
    this.leavingCollection$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cancelRoulette());
  }

  private writeCollectionUrl(context: BookCollectionContext): void {
    const tree = this.router.createUrlTree(['/'], { queryParams: collectionParams(context) });
    if (this.router.serializeUrl(tree) !== this.router.url) {
      void this.router.navigateByUrl(tree, { replaceUrl: true });
    }
  }

  private pageQuery(context: BookCollectionContext): BookPageQuery {
    return {
      page: context.page,
      pageSize: this.pageSize(),
      searchTerm: context.searchText,
      filters: { field: context.searchField, publisher: context.publisher, sort: context.sort }
    };
  }

  private loadPage(context: BookCollectionContext): Observable<BookPage> {
    const query = this.pageQuery(context);
    return this.bookApiClient.getBooksPage(query).pipe(
      switchMap(page => {
        const lastPage = Math.max(1, Math.ceil(page.total / page.pageSize));
        if (page.page <= lastPage) return of(page);
        // One correction only: never recurse if the remote collection changes again.
        const corrected = { ...context, page: lastPage };
        this.context.set(corrected);
        this.writeCollectionUrl(corrected);
        return this.bookApiClient.getBooksPage({ ...query, page: lastPage });
      })
    );
  }

  requestPage(page: number): void {
    const total = this.knownTotal();
    if (
      total === null ||
      page < 1 ||
      page > Math.max(1, Math.ceil(total / this.pageSize())) ||
      page === this.requestedPage()
    )
      return;
    this.searchActions.next({ context: { ...this.context(), page }, debounce: false });
  }

  resetFilters(): void {
    this.filters.reset({ searchTerm: '', searchField: 'all', publisher: '', sort: 'default' }, { emitEvent: false });
    this.searchActions.next(this.searchAction(false));
  }

  private searchAction(debounce: boolean, page = 1): SearchAction {
    const { searchTerm, searchField, publisher, sort } = this.filters.getRawValue();
    return { context: { page, searchText: searchTerm, searchField, publisher, sort }, debounce };
  }

  clearSearch(): void {
    this.filters.controls.searchTerm.setValue('', { emitEvent: false });
    this.searchActions.next(this.searchAction(false));
  }

  retry(): void {
    this.searchActions.next(this.searchAction(false, this.requestedPage()));
  }

  startRoulette(event?: Event, animate = this.animateRoulette): void {
    if (this.rouletteRunning() || this.rouletteLoading() || !this.availableBooks().length) return;
    this.animateRoulette = animate;

    const trigger = event?.currentTarget;
    const returnElement = trigger instanceof HTMLElement ? trigger : this.selectedElement;
    this.closePreview(false);
    this.rouletteMotionOverride.set(animate);
    this.selectedElement = returnElement;
    this.rouletteError.set(false);
    this.rouletteLoading.set(true);
    this.rouletteStatus.set('Loading roulette candidates...');
    this.loadRouletteCandidates()
      .pipe(
        takeUntil(this.candidateCancellation),
        takeUntil(this.leavingCollection$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.rouletteLoading.set(false))
      )
      .subscribe({
        next: books => this.beginRoulette(books, animate),
        error: () => {
          this.rouletteError.set(true);
          this.rouletteMotionOverride.set(false);
          this.rouletteStatus.set('');
        }
      });
  }

  retryRoulette(): void {
    this.startRoulette();
  }

  private loadRouletteCandidates(): Observable<Book[]> {
    const query = { ...this.pageQuery(this.context()), page: 1 };
    return this.bookApiClient.getBooksPage(query).pipe(
      switchMap(first =>
        range(2, Math.max(0, Math.ceil(first.total / first.pageSize) - 1)).pipe(
          concatMap(page => this.bookApiClient.getBooksPage({ ...query, page })),
          reduce((books, page) => {
            if (page.total !== first.total || !page.books.length)
              throw new Error('The collection changed during candidate loading.');
            return [...books, ...page.books];
          }, first.books)
        )
      ),
      map(books => [...new Map(books.map(book => [book.id, book])).values()])
    );
  }

  private beginRoulette(books: Book[], animate: boolean): void {
    this.pendingRouletteBook = this.randomBook(books, this.lastRouletteBookId);
    if (!this.pendingRouletteBook) {
      this.rouletteStatus.set('No books available for roulette.');
      return;
    }
    // The result is fixed before rolling so the front face and preview always agree.
    this.setCubeBooks([this.pendingRouletteBook, ...books.filter(book => book.id !== this.pendingRouletteBook?.id)]);
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
    this.candidateCancellation.next();
    this.rouletteLoading.set(false);
    this.rouletteError.set(false);
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
