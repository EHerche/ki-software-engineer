import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnChanges, input, output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { catchError, exhaustMap, map, Observable, of, startWith, Subject, tap } from 'rxjs';
import { Book } from './book';
import { BookApiClient, BookChanges } from './book-api-client.service';

type SaveState = 'idle' | 'saving' | 'error';
type RequiredField = 'title' | 'publisher' | 'abstract';

const requiredText: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };

@Component({
  selector: 'app-book-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, ReactiveFormsModule],
  templateUrl: './book-edit.component.html',
  styleUrl: './book-edit.component.css'
})
export class BookEditComponent implements OnChanges {
  private readonly bookApiClient = inject(BookApiClient);
  private readonly formBuilder = inject(FormBuilder).nonNullable;
  private readonly saveRequests = new Subject<BookChanges>();

  readonly book = input.required<Book>();
  readonly saved = output<Book>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.group({
    title: ['', requiredText],
    subtitle: '',
    author: '',
    publisher: ['', requiredText],
    numPages: new FormControl<number | null>(0),
    price: '',
    cover: '',
    abstract: ['', requiredText]
  });

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

  ngOnChanges(): void {
    this.form.reset({ ...this.book(), subtitle: this.book().subtitle ?? '' });
  }

  invalid(field: RequiredField): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const values = this.form.getRawValue();
    this.saveRequests.next({ ...values, numPages: values.numPages ?? 0 });
  }
}
