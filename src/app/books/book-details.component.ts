import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, ElementRef, inject, Injector, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  Observable,
  of,
  scan,
  startWith,
  Subject,
  switchMap
} from 'rxjs';
import { Book } from './book';
import { BookApiClient } from './book-api-client.service';
import { BookCoverComponent } from './book-cover.component';
import { BookEditComponent } from './book-edit.component';

type LoadedBookState = { status: 'loaded'; book: Book; editing: boolean };
type BookDetailsState = { status: 'loading' | 'not-found' | 'error'; book: null; editing: false } | LoadedBookState;
type EditAction = { type: 'edit' | 'cancel' } | { type: 'saved'; book: Book };

@Component({
  selector: 'app-book-details',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCoverComponent, BookEditComponent],
  templateUrl: './book-details.component.html'
})
export class BookDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bookApiClient = inject(BookApiClient);
  private readonly injector = inject(Injector);
  private readonly retryRequests = new Subject<void>();
  private readonly editActions = new Subject<EditAction>();

  @ViewChild('editButton') private editButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('editor', { read: ElementRef }) private editor?: ElementRef<HTMLElement>;

  readonly state$: Observable<BookDetailsState> = combineLatest([
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      distinctUntilChanged()
    ),
    this.retryRequests.pipe(startWith(undefined))
  ]).pipe(
    switchMap(([id]) => {
      if (!id) {
        return of<BookDetailsState>({ status: 'not-found', book: null, editing: false });
      }

      return this.bookApiClient.getBook(id).pipe(
        switchMap(book => {
          const initial: LoadedBookState = { status: 'loaded', book, editing: false };
          return this.editActions.pipe(
            scan((state: LoadedBookState, action: EditAction): LoadedBookState => {
              if (action.type === 'saved') return { status: 'loaded', book: action.book, editing: false };
              return { ...state, editing: action.type === 'edit' };
            }, initial),
            startWith(initial)
          );
        }),
        catchError((error: unknown) =>
          of<BookDetailsState>({
            status: error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
            book: null,
            editing: false
          })
        ),
        startWith<BookDetailsState>({ status: 'loading', book: null, editing: false })
      );
    })
  );

  retry(): void {
    this.retryRequests.next();
  }

  edit(): void {
    this.editActions.next({ type: 'edit' });
    afterNextRender(() => this.editor?.nativeElement.querySelector<HTMLInputElement>('#edit-title')?.focus(), {
      injector: this.injector
    });
  }

  cancelEdit(): void {
    this.editActions.next({ type: 'cancel' });
    this.focusEditButton();
  }

  bookSaved(book: Book): void {
    this.editActions.next({ type: 'saved', book });
    this.focusEditButton();
  }

  private focusEditButton(): void {
    afterNextRender(() => this.editButton?.nativeElement.focus(), { injector: this.injector });
  }
}
