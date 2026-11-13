import type { Page } from '@playwright/test';

export class AppShell {
  readonly themeToggle;
  readonly root;

  constructor(page: Page) {
    this.themeToggle = page.getByRole('switch', { name: 'Dark mode', exact: true });
    this.root = page.locator('html');
  }

  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }
}
