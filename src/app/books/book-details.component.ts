import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';

type BookDetailsState = { status: 'loading' | 'not-found' | 'error'; book: null } | { status: 'loaded'; book: Book };

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto max-w-5xl px-4 py-12">
      <a
        routerLink="/"
        class="mb-8 inline-flex items-center gap-2 rounded-sm font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
      >
        <span aria-hidden="true">&larr;</span>
        Back to collection
      </a>

      <ng-container *ngIf="state$ | async as state">
        <div *ngIf="state.status === 'loading'" role="status" class="flex items-center justify-center gap-3 py-20">
          <span
            aria-hidden="true"
            class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-700 motion-reduce:animate-none"
          ></span>
          <p class="text-gray-600">Loading book...</p>
        </div>

        <section *ngIf="state.status === 'not-found'" role="alert" class="rounded-xl bg-gray-50 p-8 text-center">
          <h1 class="mb-3 text-2xl font-bold text-gray-800">Book not found</h1>
          <p class="text-gray-600">This book is unavailable. Return to the collection to choose another book.</p>
        </section>

        <section *ngIf="state.status === 'error'" role="alert" class="rounded-xl bg-gray-50 p-8 text-center">
          <h1 class="mb-3 text-2xl font-bold text-gray-800">Unable to load book</h1>
          <p class="mb-6 text-gray-600">Please try again.</p>
          <button
            type="button"
            (click)="retry()"
            class="rounded-md bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          >
            Retry
          </button>
        </section>

        <article *ngIf="state.book as book" aria-labelledby="book-title" class="grid gap-8 md:grid-cols-[16rem_1fr]">
          <div
            class="mx-auto aspect-[3/4] w-full max-w-xs self-start overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
          >
            <img
              *ngIf="book.cover && !coverFailed; else noCover"
              [src]="book.cover"
              [alt]="'Cover of ' + book.title"
              (error)="coverFailed = true"
              class="h-full w-full object-contain"
            />
            <ng-template #noCover>
              <div class="flex h-full items-center justify-center p-6 text-center text-gray-500">
                No cover available
              </div>
            </ng-template>
          </div>

          <div class="min-w-0 break-words">
            <h1 id="book-title" class="mb-3 text-3xl font-bold text-gray-800">{{ book.title }}</h1>
            <p *ngIf="book.subtitle" class="mb-4 text-xl text-gray-600">{{ book.subtitle }}</p>
            <p class="mb-8 text-lg text-blue-700">{{ book.author }}</p>

            <dl class="grid grid-cols-1 gap-5 border-y border-gray-200 py-6 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">ISBN</dt>
                <dd class="mt-1 text-gray-800">{{ book.isbn }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Publisher</dt>
                <dd class="mt-1 text-gray-800">{{ book.publisher }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Pages</dt>
                <dd class="mt-1 text-gray-800">{{ book.numPages }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Price</dt>
                <dd class="mt-1 text-gray-800">{{ book.price }}</dd>
              </div>
            </dl>

            <section class="mt-8" aria-labelledby="book-abstract">
              <h2 id="book-abstract" class="mb-3 text-xl font-semibold text-gray-800">About this book</h2>
              <p class="whitespace-pre-line leading-relaxed text-gray-700">{{ book.abstract }}</p>
            </section>
          </div>
        </article>
      </ng-container>
    </div>
  `
})
export class BookDetailsComponent {
  private readonly retryRequests = new Subject<void>();
  readonly state$: Observable<BookDetailsState>;
  coverFailed = false;

  constructor(route: ActivatedRoute, bookApiClient: BookApiClient) {
    this.state$ = combineLatest([
      route.paramMap.pipe(
        map(params => params.get('id')),
        distinctUntilChanged()
      ),
      this.retryRequests.pipe(startWith(undefined))
    ]).pipe(
      switchMap(([id]) => {
        this.coverFailed = false;

        if (!id) {
          return of<BookDetailsState>({ status: 'not-found', book: null });
        }

        return bookApiClient.getBook(id).pipe(
          map((book): BookDetailsState => ({ status: 'loaded', book })),
          catchError((error: HttpErrorResponse) =>
            of<BookDetailsState>({ status: error.status === 404 ? 'not-found' : 'error', book: null })
          ),
          startWith<BookDetailsState>({ status: 'loading', book: null })
        );
      })
    );
  }

  retry(): void {
    this.retryRequests.next();
  }
}
