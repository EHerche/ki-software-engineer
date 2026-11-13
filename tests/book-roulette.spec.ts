import type { Page } from '@playwright/test';
import { expect, firstBook, test } from './fixtures/books';
import { BooksPage } from './pages/books.page';
import { BookDetailsPage } from './pages/book-details.page';
import { BookRoulette } from './pages/book-roulette';

const surprise = (page: Page) => new BookRoulette(page).surpriseButton;
const draw = (page: Page) => new BookRoulette(page).drawButton;

test.describe('Roulette navigation journey', () => {
  test('opens the drawn book and returns to the same filters', async ({ page }) => {
    const books = new BooksPage(page);
    const details = new BookDetailsPage(page);
    await test.step('Given one title-matching candidate', async () => {
      await page.goto('/?searchText=Angular&searchField=title');
      await expect(books.titleLinks).toHaveText([firstBook.title]);
    });
    await test.step('When drawing without animation', async () => {
      await books.roulette.draw();
    });
    await test.step('Then the result preview contains the matching book', async () => {
      await expect(books.preview.heading).toHaveText(firstBook.title);
      await expect(books.preview.rerollButton).toBeVisible();
    });
    await test.step('When continuing to details and returning', async () => {
      await books.preview.openDetails();
      await expect(details.heading).toHaveText(firstBook.title);
      await details.back();
    });
    await test.step('Then the filters remain and the preview is closed', async () => {
      await expect(page).toHaveURL('/?searchText=Angular&searchField=title');
      await expect(books.filters.search).toHaveValue('Angular');
      await expect(books.filters.field).toHaveValue('title');
      await expect(books.titleLinks).toHaveText([firstBook.title]);
      await expect(books.preview.dialog).toHaveCount(0);
    });
  });
});

test('normal motion rolls visibly before the result opens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await surprise(page).click();
  const cube = page.locator('.roulette-cube');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(cube).toHaveClass(/is-spinning/);
  await expect(cube).toHaveCSS('animation-name', /roulette-roll/);
  const initialTransform = await cube.evaluate(element => getComputedStyle(element).transform);
  await expect
    .poll(() => page.locator('.roulette-cube.is-spinning').evaluate(element => getComputedStyle(element).transform))
    .not.toBe(initialTransform);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('surprise animates under reduced motion and direct draw stays immediate', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const optIn = page.getByRole('button', { name: 'Überrasche mich!', exact: true });
  await optIn.click();
  const cube = page.locator('.roulette-cube');
  await expect(cube).toHaveClass(/is-spinning/);
  await expect(cube).toHaveCSS('animation-name', /roulette-roll/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('opt-in-animation.png') });
  const transform = await cube.evaluate(element => getComputedStyle(element).transform);
  await expect
    .poll(() => page.locator('.roulette-cube.is-spinning').evaluate(element => getComputedStyle(element).transform))
    .not.toBe(transform);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(optIn).toBeFocused();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await draw(page).click();
  await page.clock.runFor(20);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(cube).not.toHaveClass(/is-spinning/);
});
