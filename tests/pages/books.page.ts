import type { Page } from '@playwright/test';
import { CollectionFilters, CollectionPagination } from './collection-controls';
import { BookPreview } from './book-preview';
import { BookRoulette } from './book-roulette';

export class BooksPage {
  readonly heading;
  readonly searchInput;
  readonly searchField;
  readonly clearSearchButton;
  readonly addBookLink;
  readonly titleLinks;
  readonly filters;
  readonly pagination;
  readonly preview;
  readonly roulette;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Book Collection', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search the collection', exact: true });
    this.searchField = page.getByRole('combobox', { name: 'Search in', exact: true });
    this.clearSearchButton = page.getByRole('button', { name: 'Clear search', exact: true });
    this.addBookLink = page.getByRole('link', { name: 'Add book', exact: true });
    this.titleLinks = page.getByRole('heading', { level: 2 }).getByRole('link');
    this.filters = new CollectionFilters(page);
    this.pagination = new CollectionPagination(page);
    this.preview = new BookPreview(page);
    this.roulette = new BookRoulette(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  bookLink(title: string) {
    return this.page.getByRole('link', { name: title, exact: true });
  }

  async searchByTitle(title: string): Promise<void> {
    await this.searchField.selectOption('title');
    await this.searchInput.fill(title);
  }

  async clearSearch(): Promise<void> {
    await this.clearSearchButton.click();
  }

  async openBook(title: string): Promise<void> {
    await this.bookLink(title).click();
  }

  async addBook(): Promise<void> {
    await this.addBookLink.click();
  }
}
