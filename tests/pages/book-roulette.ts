import type { Page } from '@playwright/test';

export class BookRoulette {
  readonly drawButton;
  readonly surpriseButton;
  readonly retryButton;

  constructor(page: Page) {
    this.drawButton = page.getByRole('button', { name: 'Zieh eins!', exact: true });
    this.surpriseButton = page.getByRole('button', { name: 'Überrasche mich!', exact: true });
    this.retryButton = page.getByRole('button', { name: 'Retry roulette', exact: true });
  }

  async draw(): Promise<void> {
    await this.drawButton.click();
  }
}
