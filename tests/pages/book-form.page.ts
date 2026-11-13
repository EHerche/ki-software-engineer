import type { Page } from '@playwright/test';
import type { Book } from '../../src/app/books/book';

const labels = {
  title: 'Title *',
  subtitle: 'Subtitle',
  author: 'Author',
  publisher: 'Publisher *',
  numPages: 'Pages',
  price: 'Price',
  cover: 'Cover URL',
  abstract: 'Description *'
} as const;

export type EditableBookFields = Pick<Book, keyof typeof labels>;

export class BookForm {
  readonly heading;
  readonly submitButton;
  readonly cancelButton;
  readonly isbn;

  constructor(
    protected readonly page: Page,
    mode: 'create' | 'edit'
  ) {
    this.heading = page.getByRole('heading', { name: mode === 'create' ? 'Add book' : 'Edit book', exact: true });
    this.submitButton = page.getByRole('button', {
      name: mode === 'create' ? 'Create book' : 'Save changes',
      exact: true
    });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.isbn = page.getByLabel(mode === 'create' ? 'ISBN *' : 'ISBN (read-only)', { exact: true });
  }

  field(name: keyof EditableBookFields) {
    return this.page.getByLabel(labels[name], { exact: true });
  }

  async fill(changes: Partial<EditableBookFields>): Promise<void> {
    for (const name of Object.keys(changes) as (keyof EditableBookFields)[]) {
      const value = changes[name];
      if (value !== undefined) await this.field(name).fill(String(value));
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}

export class BookCreatePage extends BookForm {
  constructor(page: Page) {
    super(page, 'create');
  }

  async goto(): Promise<void> {
    await this.page.goto('/books/new');
  }

  async fillDraft(draft: EditableBookFields & Pick<Book, 'isbn'>): Promise<void> {
    const { isbn, ...changes } = draft;
    await this.isbn.fill(isbn);
    await this.fill(changes);
  }
}
