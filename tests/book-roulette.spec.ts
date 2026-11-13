import type { Page } from '@playwright/test';
import {
  apiUrl,
  booksResponse,
  expect,
  firstBook,
  secondBook,
  test,
  mockBooksPages,
  paginationBooks
} from './fixtures/books';

const surprise = (page: Page) => page.getByRole('button', { name: 'Überrasche mich!', exact: true });
const draw = (page: Page) => page.getByRole('button', { name: 'Zieh eins!', exact: true });
const reroll = (page: Page) => page.getByRole('button', { name: 'Das Schicksal herausfordern', exact: true });

for (const animate of [false, true]) {
  test(`AC-30 / all filtered pages are candidates in ${animate ? 'animated' : 'direct'} mode`, async ({ page }) => {
    await mockBooksPages(page, [
      ...paginationBooks,
      { ...firstBook, id: 'foreign', title: 'Match foreign', publisher: 'Other' }
    ]);
    const params: URLSearchParams[] = [];
    page.on('request', request => {
      if (request.url().startsWith(`${apiUrl}?`)) params.push(new URL(request.url()).searchParams);
    });
    await page.goto('/?searchText=Match&searchField=title&publisher=Target&sort=pages-asc');
    await expect(page.locator('app-book-item')).toHaveCount(10);
    params.length = 0;
    await page.evaluate(() => {
      Math.random = () => 0.999;
    });
    await (animate ? surprise(page) : draw(page)).click();
    if (animate) {
      await expect(page.locator('.roulette-cube')).toHaveClass(/is-spinning/);
      await page
        .locator('.roulette-cube')
        .evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    }
    await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(paginationBooks[22].title);
    expect(params.map(value => value.get('_page'))).toEqual(['1', '2', '3']);
    for (const value of params) {
      expect(value.get('title_like')).toBe('Match');
      expect(value.get('publisher_like')).toBe('Target');
      expect(value.get('_sort')).toBe('numPages,id');
      expect(value.get('_order')).toBe('asc,asc');
    }
    await reroll(page).click();
    if (animate) {
      await expect(page.locator('.roulette-cube')).toHaveClass(/is-spinning/);
      await page
        .locator('.roulette-cube')
        .evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    }
    await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(paginationBooks[21].title);
    expect(params).toHaveLength(6); // a fresh traversal; no durable candidates cache
  });
}

test('AC-30 / candidate page error never draws from a subset and retry reloads all', async ({ page }) => {
  await mockBooksPages(page);
  let fail = true;
  await page.route(`${apiUrl}?*`, route => {
    if (fail && new URL(route.request().url()).searchParams.get('_page') === '2')
      return route.fulfill({ status: 503, json: {} });
    return route.fallback();
  });
  await page.goto('/');
  await draw(page).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load roulette candidates');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.roulette-cube')).not.toHaveClass(/is-spinning/);
  await expect(page.locator('app-book-item')).toHaveCount(10);
  fail = false;
  await page.evaluate(() => {
    Math.random = () => 0.999;
  });
  await page.getByRole('button', { name: 'Retry roulette', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(paginationBooks[22].title);
});

for (const action of ['page', 'filter', 'navigate'] as const) {
  test(`AC-18 / AC-30 / ${action} cancels pending candidates and duplicate draw is blocked`, async ({ page }) => {
    await mockBooksPages(page);
    let release!: () => void;
    const hold = new Promise<void>(resolve => (release = resolve));
    let count = 0;
    await page.route(`${apiUrl}?*`, async route => {
      if (new URL(route.request().url()).searchParams.get('_page') !== '2') return route.fallback();
      count++;
      await hold;
      await route.fulfill(booksResponse(paginationBooks.slice(10, 20), 23));
    });
    await page.goto('/');
    await expect(page.locator('app-book-item')).toHaveCount(10);
    const pending = page.waitForRequest(request => new URL(request.url()).searchParams.get('_page') === '2');
    await draw(page).dblclick();
    const request = await pending;
    const cancelled = page.waitForEvent('requestfailed', candidate => candidate === request);
    await expect(page.getByRole('paragraph').filter({ hasText: 'Loading roulette candidates...' })).toBeVisible();
    await expect(draw(page)).toBeDisabled();
    await expect(surprise(page)).toBeDisabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(count).toBe(1);
    try {
      if (action === 'page') await page.getByRole('button', { name: 'Next page', exact: true }).click();
      if (action === 'filter') {
        await page.clock.install();
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
        await page.getByLabel('Search the collection', { exact: true }).fill('Book');
      }
      if (action === 'navigate') await page.getByRole('link', { name: paginationBooks[0].title, exact: true }).click();
      await cancelled;
    } finally {
      release();
    }
    if (action === 'filter') {
      await page.clock.runFor(300);
      await page.clock.resume();
    }
    if (action === 'navigate')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(paginationBooks[0].title);
    else await expect(page.getByText(action === 'page' ? 'Page 2 of 3' : 'Page 1 of 3', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.roulette-cube.is-spinning')).toHaveCount(0);
  });
}

test('book covers form six cube faces and the roll lands on the announced book', async ({ page }) => {
  await page.route(`${apiUrl}?*`, route =>
    route.fulfill(
      booksResponse(
        Array.from({ length: 8 }, (_, index) => ({ ...firstBook, id: `book-${index}`, title: `Book ${index + 1}` }))
      )
    )
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
    await page.route(`${apiUrl}?*`, route => route.fulfill(booksResponse([firstBook, secondBook].slice(0, count))));
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
  await page.getByRole('textbox', { name: 'Search the collection', exact: true }).fill('TypeScript');
  await page.clock.runFor(2000);
  await page.clock.resume();
  await expect(page.getByRole('link', { name: secondBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.roulette-cube.is-spinning')).toHaveCount(0);
  await expect(page.locator('#roulette-status')).toBeEmpty();
  await expect(page.getByRole('textbox', { name: 'Search the collection', exact: true })).toBeFocused();
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

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`direct draw and reroll are immediate with motion preference ${motion}`, async ({ page }) => {
    await openWithClock(page);
    await page.emulateMedia({ reducedMotion: motion });
    await draw(page).click();
    await page.clock.runFor(20);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.roulette-cube')).not.toHaveClass(/is-spinning/);
    const title = await dialog.getByRole('heading').innerText();
    await expect(page.locator('#roulette-status')).toContainText(title);
    await expect(page.getByRole('button', { name: 'Close preview' })).toBeFocused();
    await reroll(page).click();
    await page.clock.runFor(20);
    await expect(dialog.getByRole('heading')).not.toHaveText(title);
    await expect(page.locator('.roulette-cube')).not.toHaveClass(/is-spinning/);
    await page.keyboard.press('Escape');
    await page.clock.runFor(20);
    await expect(draw(page)).toBeFocused();
    await surprise(page).click();
    await page.clock.runFor(20);
    await expect(page.locator('.roulette-cube')).toHaveClass(/is-spinning/);
    await expect(page.locator('.roulette-cube')).toHaveCSS('animation-name', /roulette-roll/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await finishRoll(page);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}

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

test('surprise keeps animating through preference changes and restores focus', async ({ page }) => {
  await openWithClock(page);
  await page.clock.resume();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const optIn = page.getByRole('button', { name: 'Überrasche mich!', exact: true });
  await expect(optIn).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await optIn.click();
  await page.clock.runFor(20);
  await page
    .locator('.roulette-cube')
    .evaluate(element => element.getAnimations().forEach(animation => animation.pause()));
  await page.clock.resume();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(optIn).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(optIn).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.roulette-cube')).toHaveClass(/is-spinning/);
  await expect(page.locator('.roulette-cube')).toHaveCSS('animation-name', /roulette-roll/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(optIn).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await finishRoll(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.clock.runFor(20);
  await expect(surprise(page)).toBeFocused();
});

test('manual preview cancels an opted-in roll and clears its motion exception', async ({ page }) => {
  await openWithClock(page);
  await page.clock.resume();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Überrasche mich!', exact: true })).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Überrasche mich!', exact: true }).click();
  await page.clock.runFor(20);
  const book = page.getByRole('button', { name: `Preview ${firstBook.title}`, exact: true });
  await book.click();
  await page.clock.runFor(20);
  await expect(page.getByRole('dialog')).toContainText(firstBook.title);
  await expect(page.locator('.roulette-motion-opt-in')).toHaveCount(0);
  await expect(reroll(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.clock.runFor(20);
  await expect(book).toBeFocused();
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
      route.fulfill(booksResponse([{ ...firstBook, cover: cover === 'missing' ? '' : firstBook.cover }]))
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
        route.fulfill(
          booksResponse(
            Array.from({ length: 6 }, (_, index) => ({
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
          )
        )
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
