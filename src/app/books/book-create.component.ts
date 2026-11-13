import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, exhaustMap, map, Observable, of, startWith, Subject, tap } from 'rxjs';
import { BookApiClient, CreateBookInput } from './book-api-client.service';
import { BookFormComponent } from './book-form.component';
import { BookFormValue } from './book-form.model';

type CreateState = 'idle' | 'saving' | 'error';

@Component({
  selector: 'app-book-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, BookFormComponent],
  templateUrl: './book-create.component.html'
})
export class BookCreateComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly router = inject(Router);
  private readonly createRequests = new Subject<CreateBookInput>();

  readonly initialValue: BookFormValue = {
    isbn: '',
    title: '',
    subtitle: '',
    author: '',
    publisher: '',
    numPages: 0,
    price: '',
    cover: '',
    abstract: ''
  };

  readonly state$: Observable<CreateState> = this.createRequests.pipe(
    exhaustMap(input =>
      this.bookApiClient.createBook(input).pipe(
        tap(book => {
          void this.router.navigate(['/books', book.id]);
        }),
        map((): CreateState => 'idle'),
        catchError(() => of<CreateState>('error')),
        startWith<CreateState>('saving')
      )
    ),
    startWith<CreateState>('idle')
  );

  create(values: BookFormValue): void {
    this.createRequests.next(values);
  }

  cancel(): void {
    void this.router.navigate(['/']);
  }
}
