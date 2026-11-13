import type { Page } from '@playwright/test';
import { BookForm } from './book-form.page';

export class BookDetailsPage {
  readonly article;
  readonly heading;
  readonly editButton;
  readonly backLink;
  readonly editor;

  constructor(private readonly page: Page) {
    this.article = page.getByRole('article');
    this.heading = this.article.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit book', exact: true });
    this.backLink = page.getByRole('link', { name: 'Back to collection', exact: true });
    this.editor = new BookForm(page, 'edit');
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`/books/${encodeURIComponent(id)}`);
  }

  async edit(): Promise<void> {
    await this.editButton.click();
  }

  async back(): Promise<void> {
    await this.backLink.click();
  }
}
