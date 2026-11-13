import { ValidatorFn } from '@angular/forms';
import { CreateBookInput } from './book-api-client.service';

export type BookFormValue = CreateBookInput & { subtitle: string };
export type RequiredBookField = 'isbn' | 'title' | 'publisher' | 'abstract';

export const requiredBookText: ValidatorFn = control =>
  typeof control.value === 'string' && control.value.trim().length > 0 ? null : { required: true };
