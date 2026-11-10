import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
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
import { BookCoverComponent } from './book-cover.component';

type BookDetailsState = { status: 'loading' | 'not-found' | 'error'; book: null } | { status: 'loaded'; book: Book };

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCoverComponent],
  templateUrl: './book-details.component.html'
})
export class BookDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiClient = inject(BookApiClient);
  private readonly retryRequests = new Subject<void>();

  readonly state$: Observable<BookDetailsState> = combineLatest([
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      distinctUntilChanged()
    ),
    this.retryRequests.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([id]) => {
      if (!id) {
        return of<BookDetailsState>({ status: 'not-found', book: null });
      }

      return this.bookApiClient.getBook(id).pipe(
        map((book): BookDetailsState => ({ status: 'loaded', book })),
        catchError((error: unknown) =>
          of<BookDetailsState>({
            status: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
            book: null
          })
        ),
        startWith<BookDetailsState>({ status: 'loading', book: null })
      );
    })
  );

  retry(): void {
    this.retryRequests.next();
  }
}
