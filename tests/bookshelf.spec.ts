import { apiUrl, booksResponse, expect, firstBook, test } from './fixtures/books';

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1440]) {
    test(`spatial shelf in ${theme} at ${width}px supports cover selection and return`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      await page.route(`${apiUrl}?*`, route =>
        route.fulfill(
          booksResponse(
            Array.from({ length: 10 }, (_, i) => ({
              ...firstBook,
              id: `book-${i}`,
              title: `Book ${i + 1}`
            }))
          )
        )
      );
      await page.goto('/');
      const books = page.locator('.shelf-book');
      await expect(books).toHaveCount(10);
      await expect(books.first()).toHaveCSS('transform-style', 'preserve-3d');
      await expect(page.locator('.book-pages').first()).toBeVisible();
      const trigger = page.getByRole('button', { name: 'Preview Book 1', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: 'Book 1', exact: true });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog.getByRole('link', { name: 'View details' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.blur();
      await page.mouse.move(0, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const rows = await page
        .locator('app-book-item')
        .evaluateAll(items => new Set(items.map(item => Math.round(item.getBoundingClientRect().top))).size);
      expect(rows).toBeGreaterThan(1);
      await page.screenshot({ path: testInfo.outputPath('bookshelf.png'), fullPage: true });
    });
  }
}

test('keyboard preview works with missing covers and reduced motion, and search clears selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(`${apiUrl}?*`, route => route.fulfill(booksResponse([{ ...firstBook, cover: '' }])));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: `Preview ${firstBook.title}`, exact: true });
  await trigger.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('No cover available')).toBeVisible();
  await expect(page.locator('.shelf-book')).toHaveCSS('transition-duration', '0s');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await page.getByLabel('Search the collection').fill('new search');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
