import { ValidationError } from '@angular/forms/signals';
import { CreateBookInput } from './book-api-client.service';

export type BookFormValue = CreateBookInput & { subtitle: string };
export type BookFormDraft = Omit<BookFormValue, 'numPages'> & { numPages: number | null };
export type RequiredBookField = 'isbn' | 'title' | 'publisher' | 'abstract';

export const requiredBookText = (value: string): ValidationError | null =>
  value.trim().length > 0 ? null : { kind: 'required' };
