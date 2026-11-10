import { apiUrl, expect, firstBook, test } from './fixtures/books';

for (const theme of ['light', 'dark'] as const) {
  test(`uses the ${theme} device default and supports keyboard switching`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    const toggle = page.getByRole('switch', { name: 'Dark mode' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(toggle).toHaveAttribute('aria-checked', String(theme === 'dark'));
    await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', String(theme !== 'dark'));
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-checked', String(theme === 'dark'));
  });

  test(`restores a saved ${theme} preference on a direct details link`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
    await page.addInitScript(value => localStorage.setItem('bookmonkey-theme', value), theme);
    await page.goto(`/books/${firstBook.id}`);
    await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  });
}

test('follows device changes until explicitly switched, then persists across navigation and reload', async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('bookmonkey-theme'))).toBe('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: firstBook.title, exact: true }).click();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('link', { name: 'Back to collection' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('ignores invalid preferences and continues to follow the device', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bookmonkey-theme', 'invalid'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});

test('switches and retains the session preference when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      }
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('link', { name: firstBook.title, exact: true }).click();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});

test('switches when reading storage works but writing is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Write blocked');
    };
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1440]) {
    test(`${theme} at ${width}px: readable palette and complete screen states`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.getByLabel('Search the collection')).toBeVisible();
      await expect(page.getByRole('link', { name: firstBook.title, exact: true })).toBeVisible();
      const assertLayout = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.getByRole('switch')).toBeVisible();
      };
      await assertLayout();
      // Check actual rendered token pairs against the WCAG AA normal-text threshold.
      const ratios = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const rgb = (token: string) => {
          const hex = style.getPropertyValue(token).trim().slice(1);
          return [0, 2, 4]
            .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        };
        const luminance = (token: string) => rgb(token).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        return [
          ['--ink', '--canvas'],
          ['--muted', '--canvas'],
          ['--muted', '--surface'],
          ['--muted', '--recessed'],
          ['--accent', '--surface'],
          ['--accent', '--canvas'],
          ['--on-accent', '--accent'],
          ['--on-accent', '--accent-hover']
        ].map(([fg, bg]) => {
          const a = luminance(fg),
            b = luminance(bg);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
      for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ path: testInfo.outputPath('collection.png'), fullPage: true });
      await page.getByRole('link', { name: firstBook.title, exact: true }).click();
      await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: testInfo.outputPath('details.png'), fullPage: true });
      await page.goto('/books/missing');
      await expect(page.getByRole('heading', { name: 'Book not found' })).toBeVisible();
      await assertLayout();
      await page.route(`${apiUrl}/*`, route => route.fulfill({ json: { ...firstBook, cover: '' } }));
      await page.goto(`/books/${firstBook.id}`);
      await expect(page.getByText('No cover available')).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: testInfo.outputPath('missing-cover.png'), fullPage: true });
      await page.route(`${apiUrl}?*`, route => route.fulfill({ json: [] }));
      await page.goto('/');
      await expect(page.getByText('No books available', { exact: true })).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });
      await page.route(`${apiUrl}?*`, route => route.fulfill({ status: 503, json: {} }));
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: testInfo.outputPath('error.png'), fullPage: true });
      let release!: () => void;
      const waiting = new Promise<void>(resolve => {
        release = resolve;
      });
      await page.route(`${apiUrl}?*`, async route => {
        await waiting;
        await route.fulfill({ json: [] });
      });
      try {
        await page.getByRole('button', { name: 'Retry' }).click();
        await expect(page.getByRole('status')).toBeVisible();
        await assertLayout();
        await page.screenshot({ path: testInfo.outputPath('loading.png'), fullPage: true });
      } finally {
        release();
      }
      await expect(page.getByText('No books available', { exact: true })).toBeVisible();
    });
  }
}
