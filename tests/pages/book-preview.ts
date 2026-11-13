import type { Page } from '@playwright/test';

export class BookPreview {
  readonly dialog;
  readonly heading;
  readonly closeButton;
  readonly detailsLink;
  readonly rerollButton;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.heading = this.dialog.getByRole('heading', { level: 2 });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close preview', exact: true });
    this.detailsLink = this.dialog.getByRole('link', { name: 'View details', exact: true });
    this.rerollButton = this.dialog.getByRole('button', { name: 'Das Schicksal herausfordern', exact: true });
  }

  trigger(title: string) {
    return this.page.getByRole('button', { name: `Preview ${title}`, exact: true });
  }

  async open(title: string): Promise<void> {
    await this.trigger(title).click();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }

  async openDetails(): Promise<void> {
    await this.detailsLink.click();
  }
}
