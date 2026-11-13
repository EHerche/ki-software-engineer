import { ChangeDetectionStrategy, Component, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
import { form, FormField, required, submit, validate } from '@angular/forms/signals';
import { BookFormDraft, BookFormValue, RequiredBookField, requiredBookText } from './book-form.model';

@Component({
  selector: 'app-book-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField],
  templateUrl: './book-form.component.html',
  styleUrl: './book-form.component.css'
})
export class BookFormComponent implements OnChanges {
  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input.required<BookFormValue>();
  readonly isbn = input('');
  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<BookFormValue>();
  readonly cancelled = output<void>();

  readonly model = signal<BookFormDraft>({
    isbn: '',
    title: '',
    subtitle: '',
    author: '',
    publisher: '',
    numPages: null,
    price: '',
    cover: '',
    abstract: ''
  });

  readonly form = form(this.model, path => {
    required(path.isbn, { when: () => this.mode() === 'create' });
    required(path.title);
    required(path.publisher);
    required(path.abstract);
    validate(path.isbn, ({ value }) => (this.mode() === 'create' ? requiredBookText(value()) : null));
    validate(path.title, ({ value }) => requiredBookText(value()));
    validate(path.publisher, ({ value }) => requiredBookText(value()));
    validate(path.abstract, ({ value }) => requiredBookText(value()));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['mode']) {
      const values = this.initialValue();
      this.form().reset({
        isbn: values.isbn,
        title: values.title,
        subtitle: values.subtitle,
        author: values.author,
        publisher: values.publisher,
        price: values.price,
        cover: values.cover,
        abstract: values.abstract,
        numPages: this.mode() === 'create' && values.numPages === 0 ? null : values.numPages
      });
    }
  }

  invalid(field: RequiredBookField): boolean {
    const state = this.form[field]();
    return state.touched() && state.errors().length > 0;
  }

  submit(event: Event, pagesInput: HTMLInputElement): void {
    event.preventDefault();
    if (this.pending()) return;
    // Native number controls expose incomplete numbers as empty; preserve the previous blank-to-zero contract.
    if (pagesInput.validity.badInput) {
      pagesInput.value = '';
      pagesInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    void submit(this.form, async () => {
      const values = this.model();
      this.submitted.emit({ ...values, numPages: values.numPages ?? 0 });
    });
  }
}
