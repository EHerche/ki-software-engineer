import type { Page } from '@playwright/test';
import { apiUrl, expect, firstBook, secondBook, test } from './fixtures/books';

const surprise = (page: Page) => page.getByRole('button', { name: 'Überrasche mich!', exact: true });
const reroll = (page: Page) => page.getByRole('button', { name: 'Das Schicksal herausfordern', exact: true });

test('book covers form six cube faces and the roll lands on the announced book', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route =>
    route.fulfill({
      json: Array.from({ length: 8 }, (_, index) => ({ ...firstBook, id: `book-${index}`, title: `Book ${index + 1}` }))
    })
  );
  await openWithClock(page);
  // Exercise a winner beyond the six initially visible faces.
  await page.evaluate(() => {
    Math.random = () => 0.999;
  });
  await expect(page.locator('.cube-face app-book-cover')).toHaveCount(6);
  await surprise(page).click();
  await page.clock.runFor(20);
  const cube = page.locator('.roulette-cube');
  const transforms = await cube.evaluate(element => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 200;
    const first = getComputedStyle(element).transform;
    animation.currentTime = 600;
    const second = getComputedStyle(element).transform;
    animation.currentTime = 2799.99;
    const end = new DOMMatrix(getComputedStyle(element).transform);
    return { first, second, diagonal: [end.m11, end.m22, end.m33], offDiagonal: [end.m12, end.m13, end.m23] };
  });
  expect(transforms.first).not.toBe(transforms.second);
  for (const value of transforms.diagonal) expect(value).toBeCloseTo(1);
  for (const value of transforms.offDiagonal) expect(value).toBeCloseTo(0);
  const landedTitle = await page.locator('.cube-front .cube-title').innerText();
  expect(landedTitle).toBe('Book 8');
  await finishRoll(page);
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(landedTitle);
});

async function openWithClock(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  await expect(surprise(page)).toBeEnabled();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

async function finishRoll(page: Page): Promise<void> {
  await page.locator('.roulette-cube').evaluate(
    element =>
      new Promise<void>(resolve => {
        element.addEventListener('animationend', () => resolve(), { once: true });
        element.getAnimations().forEach(animation => animation.finish());
      })
  );
  await page.clock.runFor(20);
}

test('manual preview cancels the roulette and returns focus to the chosen book', async ({ page }) => {
  await openWithClock(page);
  await surprise(page).click();
  await page.clock.runFor(20);
  const book = page.getByRole('button', { name: `Preview ${firstBook.title}`, exact: true });
  await book.click();
  await page.clock.runFor(20);
  await expect(page.getByRole('dialog')).toContainText(firstBook.title);
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await page.clock.runFor(2000);
  await expect(page.getByRole('dialog')).toContainText(firstBook.title);
  await expect(reroll(page)).toHaveCount(0);
  await expect(page.locator('.book-picker.is-selected')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.clock.runFor(20);
  await expect(book).toBeFocused();
  await expect(page.locator('.book-picker.is-selected')).toHaveCount(0);
});

test('rotates a cube without cycling shelf selection, then announces the result and description', async ({ page }) => {
  await openWithClock(page);
  await surprise(page).click();
  await page.clock.runFor(20);
  await expect(page.locator('.roulette-cube.is-spinning')).toBeVisible();
  await expect(surprise(page)).toBeDisabled();
  await page.clock.runFor(400);
  await expect(page.locator('.book-picker.is-selected')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await finishRoll(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(firstBook.abstract);
  const title = await dialog.getByRole('heading').innerText();
  await expect(page.locator('#roulette-status')).toContainText(title);
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.clock.runFor(20);
  await expect(surprise(page)).toBeFocused();
});

for (const count of [1, 2]) {
  test(`${count}-book roulette supports reroll without an avoidable immediate duplicate`, async ({ page }) => {
    await page.route(`${apiUrl}?*`, route => route.fulfill({ json: [firstBook, secondBook].slice(0, count) }));
    await openWithClock(page);
    await surprise(page).click();
    await page.clock.runFor(20);
    await finishRoll(page);
    const firstTitle = await page.getByRole('dialog').getByRole('heading').innerText();
    await reroll(page).click();
    await page.clock.runFor(20);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await finishRoll(page);
    const nextTitle = await page.getByRole('dialog').getByRole('heading').innerText();
    if (count === 1) expect(nextTitle).toBe(firstTitle);
    else expect(nextTitle).not.toBe(firstTitle);
    await page.keyboard.press('Escape');
    await page.clock.runFor(20);
    await expect(surprise(page)).toBeFocused();
  });
}

test('search cancels animation and prevents a late result', async ({ page }) => {
  await openWithClock(page);
  await surprise(page).click();
  await page.clock.runFor(20);
  await page.getByRole('textbox').fill('TypeScript');
  await page.clock.runFor(2000);
  await page.clock.resume();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.roulette-cube.is-spinning')).toHaveCount(0);
  await expect(page.locator('#roulette-status')).toBeEmpty();
  await expect(page.getByRole('textbox')).toBeFocused();
});

test('explicit roll visibly animates even when the system reduces motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

test('waits for the real animation end instead of opening the dialog on a timer', async ({ page }) => {
  await openWithClock(page);
  await expect(page.getByRole('button', { name: 'Ohne Animation ziehen', exact: true })).toHaveCount(0);
  await surprise(page).click();
  await page.clock.runFor(20);
  await page
    .locator('.roulette-cube')
    .evaluate(element => element.getAnimations().forEach(animation => animation.pause()));
  await page.clock.runFor(5000);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await finishRoll(page);
  await expect(page.getByRole('dialog')).toBeVisible();
});

for (const cover of ['missing', 'broken']) {
  test(`roulette result handles a ${cover} cover`, async ({ page }) => {
    await page.route(`${apiUrl}?*`, route =>
      route.fulfill({ json: [{ ...firstBook, cover: cover === 'missing' ? '' : firstBook.cover }] })
    );
    await page.route('http://localhost:4730/covers/**', route => route.abort());
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await surprise(page).click();
    await page.clock.runFor(20);
    await expect(page.getByRole('dialog').getByText('No cover available', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(firstBook.abstract);
  });
}

for (const width of [375, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`cube and result fit ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.route(`${apiUrl}?*`, route =>
        route.fulfill({
          json: Array.from({ length: 6 }, (_, index) => ({
            ...firstBook,
            id: `cube-book-${index}`,
            title: [
              'Angular in Practice',
              'Practical TypeScript',
              'The Reading Room',
              'Clean Code',
              'Design Stories',
              'Web Worlds'
            ][index],
            cover: `http://localhost:4730/covers/cube-${index}.svg`
          }))
        })
      );
      await page.route('http://localhost:4730/covers/cube-*.svg', route => {
        const index = Number(
          route
            .request()
            .url()
            .match(/cube-(\d)/)![1]
        );
        const color = ['#245c45', '#305b80', '#794730', '#603c70', '#704f10', '#305d62'][index];
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${color}"/><rect x="24" y="24" width="252" height="352" fill="none" stroke="#f2e7d2" stroke-width="3"/><text x="150" y="220" text-anchor="middle" fill="#f2e7d2" font-family="serif" font-size="100">${index + 1}</text></svg>`
        });
      });
      await openWithClock(page);
      await surprise(page).click();
      await page.clock.runFor(20);
      await expect(page.locator('.roulette-cube.is-spinning')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('spin.png') });
      await finishRoll(page);
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await page.getByRole('dialog').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath('result.png') });
    });
  }
}
