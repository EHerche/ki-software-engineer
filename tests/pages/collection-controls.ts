import type { Page } from '@playwright/test';

export class CollectionFilters {
  readonly search;
  readonly field;
  readonly publisher;
  readonly sort;
  readonly resetButton;

  constructor(page: Page) {
    this.search = page.getByRole('textbox', { name: 'Search the collection', exact: true });
    this.field = page.getByRole('combobox', { name: 'Search in', exact: true });
    this.publisher = page.getByRole('textbox', { name: 'Publisher', exact: true });
    this.sort = page.getByRole('combobox', { name: 'Sort by', exact: true });
    this.resetButton = page.getByRole('button', { name: 'Reset filters', exact: true });
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
  }
}

export class CollectionPagination {
  readonly nextButton;
  readonly previousButton;
  readonly status;

  constructor(page: Page) {
    this.nextButton = page.getByRole('button', { name: 'Next page', exact: true });
    this.previousButton = page.getByRole('button', { name: 'Previous page', exact: true });
    this.status = page.getByText(/^Page \d+ of \d+$/);
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async previous(): Promise<void> {
    await this.previousButton.click();
  }
}
