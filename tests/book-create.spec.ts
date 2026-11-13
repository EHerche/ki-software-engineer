import type { Page } from '@playwright/test';
import { apiUrl, expect, test } from './fixtures/books';

const draft = {
  isbn: 'draft-isbn',
  title: 'A newly created book',
  subtitle: 'Fresh pages',
  author: 'New Writer',
  publisher: 'New Press',
  numPages: 123,
  price: 'a flexible price',
  cover: 'http://localhost:4730/covers/new.svg',
  abstract: 'First paragraph.\nSecond paragraph.'
};
const labels = {
  isbn: 'ISBN *',
  title: 'Title *',
  subtitle: 'Subtitle',
  author: 'Author',
  publisher: 'Publisher *',
  numPages: 'Pages',
  price: 'Price',
  cover: 'Cover URL',
  abstract: 'Description *'
};
const saved = { ...draft, id: 'server-returned-id' };

async function fillDraft(page: Page): Promise<void> {
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    await page.getByLabel(labels[key], { exact: true }).fill(String(draft[key]));
  }
}

async function mockCreatedDetails(page: Page): Promise<void> {
  await page.route(`${apiUrl}/${saved.id}`, route => route.fulfill({ json: saved }));
}

for (const entry of ['collection', 'deep link']) {
  test(`AC-7 / Anlage per ${entry}`, async ({ page }) => {
    let newGets = 0;
    page.on('request', request => {
      if (request.method() === 'GET' && request.url() === `${apiUrl}/new`) newGets++;
    });
    if (entry === 'collection') {
      await page.goto('/');
      await page.getByRole('link', { name: 'Add book', exact: true }).focus();
      await page.keyboard.press('Enter');
    } else await page.goto('/books/new');
    await expect(page.getByRole('heading', { name: 'Add book', exact: true })).toBeVisible();
    await expect(page).toHaveURL('/books/new');
    for (const label of Object.values(labels)) await expect(page.getByLabel(label, { exact: true })).toHaveValue('');
    await expect(page.getByLabel('ISBN *', { exact: true })).toBeEditable();
    await expect(page.locator('input[name="id"], input[name="userId"]')).toHaveCount(0);
    expect(newGets).toBe(0);
  });
}

test('AC-8 / Anlage speichert und öffnet Ergebnis', async ({ page }) => {
  let stored: typeof saved | undefined;
  let posts = 0;
  await page.route(apiUrl, route => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    expect(route.request().headers()['content-type']).toContain('application/json');
    expect(route.request().postDataJSON()).toEqual(draft);
    stored = saved;
    return route.fulfill({ status: 201, json: stored });
  });
  await page.route(`${apiUrl}/${saved.id}`, route => route.fulfill({ status: stored ? 200 : 404, json: stored ?? {} }));
  await page.goto('/books/new');
  await fillDraft(page);
  await page.getByRole('button', { name: 'Create book', exact: true }).click();
  await expect(page).toHaveURL(`/books/${saved.id}`);
  await expect(page.getByRole('heading', { name: draft.title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: draft.title, exact: true })).toBeVisible();
  await expect(page.getByRole('article').getByText(draft.isbn, { exact: true })).toBeVisible();
  expect(posts).toBe(1);
});

for (const invalid of ['', '   ']) {
  test(`AC-9 / Anlage validiert ${invalid ? 'Whitespace' : 'Leerwerte'} und Korrektur`, async ({ page }) => {
    let posts = 0;
    await mockCreatedDetails(page);
    await page.route(apiUrl, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      posts++;
      expect(route.request().postDataJSON()).toEqual({
        isbn: 'corrected-isbn',
        title: 'Corrected title',
        publisher: 'Corrected publisher',
        abstract: 'Corrected description',
        subtitle: '',
        author: '',
        numPages: 0,
        price: '',
        cover: ''
      });
      return route.fulfill({ status: 201, json: saved });
    });
    await page.goto('/books/new');
    const required = [
      ['ISBN *', 'Enter an ISBN.', 'corrected-isbn'],
      ['Title *', 'Enter a title.', 'Corrected title'],
      ['Publisher *', 'Enter a publisher.', 'Corrected publisher'],
      ['Description *', 'Enter a description.', 'Corrected description']
    ];
    for (const [label] of required) await page.getByLabel(label, { exact: true }).fill(invalid);
    await page.getByRole('button', { name: 'Create book', exact: true }).click();
    for (const [label, message] of required) {
      await expect(page.getByLabel(label, { exact: true })).toHaveAccessibleDescription(message);
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
    }
    expect(posts).toBe(0);
    for (const [label, , value] of required) {
      await page.getByLabel(label, { exact: true }).fill(value);
      await page.getByRole('button', { name: 'Create book', exact: true }).click();
    }
    await expect(page).toHaveURL(`/books/${saved.id}`);
    expect(posts).toBe(1);
  });
}

test('AC-10 / Anlage abbrechen', async ({ page }) => {
  let posts = 0;
  page.on('request', request => {
    if (request.method() === 'POST') posts++;
  });
  await page.goto('/books/new');
  await fillDraft(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
  expect(posts).toBe(0);
});

test('AC-11 / Anlage verhindert Doppelabsenden', async ({ page }) => {
  let posts = 0;
  let release!: () => void;
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  await mockCreatedDetails(page);
  await page.route(apiUrl, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    await waiting;
    return route.fulfill({ status: 201, json: saved });
  });
  await page.goto('/books/new');
  await fillDraft(page);
  try {
    await page.getByRole('button', { name: 'Create book', exact: true }).evaluate(button => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(page.getByRole('status')).toHaveText('Saving book...');
    for (const label of Object.values(labels)) await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    expect(posts).toBe(1);
  } finally {
    release();
  }
  await expect(page).toHaveURL(`/books/${saved.id}`);
});

for (const failure of [400, 500, 'network', 'response-lost'] as const) {
  test(`AC-12 / Anlagefehler ${failure} und bewusste Wiederholung`, async ({ page }) => {
    let posts = 0;
    await mockCreatedDetails(page);
    await page.route(apiUrl, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      posts++;
      if (posts === 1)
        return typeof failure === 'number' ? route.fulfill({ status: failure, json: {} }) : route.abort('failed');
      // An accepted write whose response was lost may conflict on deliberate retry.
      if (failure === 'response-lost') return route.fulfill({ status: 500, body: 'Insert failed, duplicate id' });
      return route.fulfill({ status: 201, json: saved });
    });
    await page.clock.install();
    await page.goto('/books/new');
    await fillDraft(page);
    await page.getByRole('button', { name: 'Create book', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Unable to save the book. Your changes are still here.');
    for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
      await expect(page.getByLabel(labels[key], { exact: true })).toHaveValue(String(draft[key]));
    }
    await page.clock.fastForward(5000);
    expect(posts).toBe(1);
    await page.getByRole('button', { name: 'Create book', exact: true }).click();
    if (failure === 'response-lost') {
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByLabel('Title *', { exact: true })).toHaveValue(draft.title);
      await expect(page).toHaveURL('/books/new');
    } else await expect(page).toHaveURL(`/books/${saved.id}`);
    expect(posts).toBe(2);
  });
}

test('AC-12 / Navigation verwirft Entwurf und bricht ausstehenden POST ab', async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(apiUrl, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await waiting;
    return route.fulfill({ status: 201, json: saved });
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Add book', exact: true }).click();
  await fillDraft(page);
  const requested = page.waitForRequest(request => request.method() === 'POST');
  await page.getByRole('button', { name: 'Create book', exact: true }).click();
  await requested;
  try {
    const cancelled = page.waitForEvent('requestfailed', request => request.method() === 'POST');
    await page.goBack();
    await cancelled;
    await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
  } finally {
    release();
  }
  await page.getByRole('link', { name: 'Add book', exact: true }).click();
  await expect(page.getByLabel('Title *', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL('/books/new');
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1440]) {
    test(`AC-28 / Anlage mobil und Theme ${theme} ${width}px`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/books/new');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.getByLabel('Title *', { exact: true }).focus();
      await expect(page.getByLabel('Title *', { exact: true })).toBeFocused();
      await expect(page.getByLabel('Title *', { exact: true })).toHaveCSS('outline-style', 'solid');
      await page.getByLabel('Title *', { exact: true }).blur();
      await expect(page.getByLabel('Title *', { exact: true })).toHaveAccessibleDescription('Enter a title.');
      await page.getByRole('button', { name: 'Create book', exact: true }).click();
      await expect(page.getByLabel('ISBN *', { exact: true })).toHaveAccessibleDescription('Enter an ISBN.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('create-validation.png'), fullPage: true });
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCSS('outline-style', 'solid');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Book Collection', exact: true })).toBeVisible();
    });
  }
}

test('SF-6 / Enter validates create fields and submits without reloading the document', async ({ page }) => {
  let posts = 0;
  let documentRequests = 0;
  await mockCreatedDetails(page);
  await page.route(apiUrl, route => {
    if (route.request().method() !== 'POST') return route.fallback();
    posts++;
    expect(route.request().postDataJSON()).toEqual(draft);
    return route.fulfill({ status: 201, json: saved });
  });
  await page.goto('/books/new');
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++;
  });
  await page.getByLabel('Title *', { exact: true }).press('Enter');
  await expect(page.getByLabel('Title *', { exact: true })).toHaveAccessibleDescription('Enter a title.');
  await expect(page).toHaveURL('/books/new');
  expect(posts).toBe(0);
  await fillDraft(page);
  await page.getByLabel('Title *', { exact: true }).press('Enter');
  await expect(page).toHaveURL(`/books/${saved.id}`);
  await expect(page.getByRole('heading', { name: draft.title, exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(documentRequests).toBe(0);
});

for (const initialPages of ['', '123']) {
  test(`SF-4 / Malformed create pages after ${initialPages ? 'a valid number' : 'a blank'} normalize to zero`, async ({
    page
  }) => {
    let posts = 0;
    await mockCreatedDetails(page);
    await page.route(apiUrl, route => {
      if (route.request().method() !== 'POST') return route.fallback();
      posts++;
      expect(route.request().postDataJSON()).toEqual({ ...draft, numPages: 0 });
      return route.fulfill({ status: 201, json: saved });
    });
    await page.goto('/books/new');
    await fillDraft(page);
    const pages = page.getByLabel('Pages', { exact: true });
    await pages.fill(initialPages);
    await pages.evaluate(
      () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    );
    await pages.press('ControlOrMeta+A');
    await pages.pressSequentially('-');
    expect(await pages.evaluate((input: HTMLInputElement) => input.validity.badInput)).toBe(true);
    await expect(pages).toHaveValue('');
    await page.getByLabel('Title *', { exact: true }).fill('   ');
    await page.getByRole('button', { name: 'Create book', exact: true }).click();
    await expect(page.getByLabel('Title *', { exact: true })).toHaveAccessibleDescription('Enter a title.');
    expect(posts).toBe(0);
    await page.getByLabel('Title *', { exact: true }).fill(draft.title);
    await pages.fill(initialPages);
    await pages.evaluate(
      () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    );
    await pages.press('ControlOrMeta+A');
    await pages.pressSequentially('-');
    expect(await pages.evaluate((input: HTMLInputElement) => input.validity.badInput)).toBe(true);
    await page.getByRole('button', { name: 'Create book', exact: true }).click();
    await expect(page).toHaveURL(`/books/${saved.id}`);
    expect(posts).toBe(1);
  });
}
