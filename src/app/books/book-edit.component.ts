import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { catchError, exhaustMap, map, Observable, of, startWith, Subject, tap } from 'rxjs';
import { Book } from './book';
import { BookApiClient, BookChanges } from './book-api-client.service';
import { BookFormComponent } from './book-form.component';
import { BookFormValue } from './book-form.model';

type SaveState = 'idle' | 'saving' | 'error';

@Component({
  selector: 'app-book-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, BookFormComponent],
  templateUrl: './book-edit.component.html',
  styleUrl: './book-edit.component.css'
})
export class BookEditComponent {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly saveRequests = new Subject<BookChanges>();

  readonly book = input.required<Book>();
  readonly saved = output<Book>();
  readonly cancelled = output<void>();
  readonly initialValue = computed<BookFormValue>(() => ({ ...this.book(), subtitle: this.book().subtitle ?? '' }));

  readonly saveState$: Observable<SaveState> = this.saveRequests.pipe(
    exhaustMap(changes =>
      this.bookApiClient.updateBook(this.book(), changes).pipe(
        tap(book => this.saved.emit(book)),
        map((): SaveState => 'idle'),
        catchError(() => of<SaveState>('error')),
        startWith<SaveState>('saving')
      )
    ),
    startWith<SaveState>('idle')
  );

  save(values: BookFormValue): void {
    // ISBN is never editable here; the client preserves the original protected fields.
    const { isbn: _isbn, ...changes } = values;
    this.saveRequests.next(changes);
  }
}
