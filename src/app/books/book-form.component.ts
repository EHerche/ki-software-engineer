import { ChangeDetectionStrategy, Component, inject, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { BookFormValue, RequiredBookField, requiredBookText } from './book-form.model';

@Component({
  selector: 'app-book-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './book-form.component.html',
  styleUrl: './book-form.component.css'
})
export class BookFormComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder).nonNullable;

  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input.required<BookFormValue>();
  readonly isbn = input('');
  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<BookFormValue>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.group({
    isbn: '',
    title: ['', requiredBookText],
    subtitle: '',
    author: '',
    publisher: ['', requiredBookText],
    numPages: new FormControl<number | null>(null),
    price: '',
    cover: '',
    abstract: ['', requiredBookText]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.form.controls.isbn.setValidators(this.mode() === 'create' ? requiredBookText : null);
    }
    if (changes['initialValue'] || changes['mode']) {
      const values = this.initialValue();
      this.form.reset({
        ...values,
        numPages: this.mode() === 'create' && values.numPages === 0 ? null : values.numPages
      });
    }
  }

  invalid(field: RequiredBookField): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  submit(): void {
    if (this.pending()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.submitted.emit({ ...values, numPages: values.numPages ?? 0 });
  }
}
