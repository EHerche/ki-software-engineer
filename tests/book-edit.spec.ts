import type { Page } from '@playwright/test';
import type { Book } from '../src/app/books/book';
import type { BookChanges } from '../src/app/books/book-api-client.service';
import { apiUrl, booksResponse, expect, firstBook, secondBook, test } from './fixtures/books';

const updatedFields: BookChanges = {
  title: 'Updated Angular',
  subtitle: 'A revised guide',
  author: 'Grace Writer',
  publisher: 'Revised Press',
  numPages: 480,
  price: 'EUR 35.50',
  cover: 'http://localhost:4730/covers/updated.svg',
  abstract: 'Updated description.\nA second paragraph.'
};

async function openEditor(page: Page): Promise<void> {
  await page.goto(`/books/${firstBook.id}`);
  const edit = page.getByRole('button', { name: 'Edit book', exact: true });
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Edit book', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title *', { exact: true })).toBeFocused();
}

async function fillChanges(page: Page): Promise<void> {
  for (const [label, value] of [
    ['Title *', updatedFields.title],
    ['Subtitle', updatedFields.subtitle!],
    ['Author', updatedFields.author],
    ['Publisher *', updatedFields.publisher],
    ['Pages', String(updatedFields.numPages)],
    ['Price', updatedFields.price],
    ['Cover URL', updatedFields.cover],
    ['Description *', updatedFields.abstract]
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

test('prefills all eight editable fields and shows the protected ISBN', async ({ page }) => {
  await openEditor(page);
  for (const [label, value] of [
    ['Title *', firstBook.title],
    ['Subtitle', firstBook.subtitle!],
    ['Author', firstBook.author],
    ['Publisher *', firstBook.publisher],
    ['Pages', String(firstBook.numPages)],
    ['Price', firstBook.price],
    ['Cover URL', firstBook.cover],
    ['Description *', firstBook.abstract],
    ['ISBN (read-only)', firstBook.isbn]
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  await expect(page.getByLabel('ISBN (read-only)')).toHaveAttribute('readonly', '');
  await expect(page.locator('input[name="id"], input[name="userId"]')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('saves every editable field with original ISBN and IDs and retains the changes on reload and in the collection', async ({
  page
}) => {
  let stored = { ...firstBook };
  let updates = 0;
  await page.route(`${apiUrl}/${firstBook.id}`, route => {
    if (route.request().method() === 'PUT') {
      updates++;
      expect(route.request().headers()['content-type']).toContain('application/json');
      const body: Book = route.request().postDataJSON();
      expect(body).toEqual({ ...firstBook, ...updatedFields });
      stored = body;
    }
    return route.fulfill({ json: stored });
  });
  await page.route(`${apiUrl}?*`, route => route.fulfill(booksResponse([stored])));
  await openEditor(page);
  await fillChanges(page);

  // Even a modified read-only DOM value is never used as an editable field.
  await page.getByLabel('ISBN (read-only)').evaluate((input: HTMLInputElement) => {
    input.removeAttribute('readonly');
    input.value = 'tampered-isbn';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: updatedFields.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit book', exact: true })).toBeFocused();
  for (const value of [
    updatedFields.subtitle!,
    updatedFields.author,
    updatedFields.publisher,
    String(updatedFields.numPages),
    updatedFields.price,
    updatedFields.abstract,
    firstBook.isbn
  ]) {
    await expect(page.getByRole('article').getByText(value, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('img')).toHaveAttribute('src', updatedFields.cover);
  await expect(page).toHaveURL(`/books/${firstBook.id}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: updatedFields.title, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to collection' }).click();
  await expect(page.getByRole('link', { name: updatedFields.title, exact: true })).toBeVisible();
  expect(updates).toBe(1);
  expect(stored.id).toBe(firstBook.id);
  expect(stored.userId).toBe(firstBook.userId);
  expect(stored.isbn).toBe(firstBook.isbn);
});

for (const invalid of ['', '   ']) {
  test(`blocks ${invalid ? 'whitespace-only' : 'empty'} required fields and accepts corrected values`, async ({
    page
  }) => {
    let updates = 0;
    await page.route(`${apiUrl}/${firstBook.id}`, route => {
      if (route.request().method() === 'PUT') {
        updates++;
        return route.fulfill({ json: route.request().postDataJSON() });
      }
      return route.fulfill({ json: firstBook });
    });
    await openEditor(page);
    for (const label of ['Title *', 'Publisher *', 'Description *']) {
      await page.getByLabel(label, { exact: true }).fill(invalid);
    }
    await page.getByRole('button', { name: 'Save changes' }).click();
    for (const [label, message] of [
      ['Title *', 'Enter a title.'],
      ['Publisher *', 'Enter a publisher.'],
      ['Description *', 'Enter a description.']
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    }
    expect(updates).toBe(0);
    await page.getByLabel('Title *', { exact: true }).fill('Corrected title');
    await expect(page.getByText('Enter a title.', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save changes' }).click();
    expect(updates).toBe(0);
    await page.getByLabel('Publisher *', { exact: true }).fill('Corrected publisher');
    await page.getByLabel('Description *', { exact: true }).fill('Corrected description');
    for (const label of ['Title *', 'Publisher *', 'Description *']) {
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'false');
    }
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Corrected title', exact: true })).toBeVisible();
    expect(updates).toBe(1);
  });
}

test('cancels without writing or changing details and reopens with original values', async ({ page }) => {
  let writes = 0;
  page.on('request', request => {
    if (request.url().startsWith(apiUrl) && request.method() !== 'GET') writes++;
  });
  await openEditor(page);
  await fillChanges(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit book', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Title *', { exact: true })).toHaveValue(firstBook.title);
  await expect(page.getByLabel('Description *', { exact: true })).toHaveValue(firstBook.abstract);
  expect(writes).toBe(0);
});

for (const failure of [400, 403, 404, 503, 'network'] as const) {
  test(`retains all input after a ${failure} save failure and allows retry`, async ({ page }) => {
    let updates = 0;
    await page.route(`${apiUrl}/${firstBook.id}`, route => {
      if (route.request().method() !== 'PUT') return route.fulfill({ json: firstBook });
      updates++;
      if (updates === 1) {
        return failure === 'network' ? route.abort('failed') : route.fulfill({ status: failure, json: {} });
      }
      return route.fulfill({ json: route.request().postDataJSON() });
    });
    await openEditor(page);
    await fillChanges(page);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('alert')).toContainText('Unable to save the book. Your changes are still here.');
    for (const [label, value] of [
      ['Title *', updatedFields.title],
      ['Subtitle', updatedFields.subtitle!],
      ['Author', updatedFields.author],
      ['Publisher *', updatedFields.publisher],
      ['Pages', String(updatedFields.numPages)],
      ['Price', updatedFields.price],
      ['Cover URL', updatedFields.cover],
      ['Description *', updatedFields.abstract]
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
      await expect(page.getByLabel(label, { exact: true })).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: updatedFields.title, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(updates).toBe(2);
  });
}

test('shows pending save state and prevents duplicate submissions or edits', async ({ page }) => {
  let updates = 0;
  let release!: () => void;
  const waiting = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}/${firstBook.id}`, async route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: firstBook });
    updates++;
    await waiting;
    return route.fulfill({ json: route.request().postDataJSON() });
  });
  await openEditor(page);
  await page.getByLabel('Title *', { exact: true }).fill(updatedFields.title);
  try {
    const requested = page.waitForRequest(request => request.method() === 'PUT');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await requested;
    await expect(page.getByRole('status')).toHaveText('Saving book...');
    await expect(page.getByLabel('Title *', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await page.locator('form').evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    expect(updates).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: updatedFields.title, exact: true })).toBeVisible();
  expect(updates).toBe(1);
});

test('supports absent subtitle and clearing optional fields without extra business validation', async ({ page }) => {
  const { subtitle, ...book } = firstBook;
  await page.route(`${apiUrl}/${firstBook.id}`, route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: book });
    const body: Book = route.request().postDataJSON();
    expect(body).toEqual({ ...book, subtitle: '', author: '', numPages: 0, price: '', cover: '' });
    return route.fulfill({ json: body });
  });
  await openEditor(page);
  await expect(page.getByLabel('Subtitle', { exact: true })).toHaveValue('');
  for (const label of ['Author', 'Pages', 'Price', 'Cover URL']) {
    await page.getByLabel(label, { exact: true }).fill('');
  }
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await expect(page.getByText('No cover available', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('changing book IDs discards the old draft and cancels an in-flight save', async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => (release = resolve));
  await page.route(`${apiUrl}/${firstBook.id}`, async route => {
    if (route.request().method() !== 'PUT') return route.fulfill({ json: firstBook });
    await waiting;
    return route.fulfill({ json: route.request().postDataJSON() });
  });
  await openEditor(page);
  await page.getByLabel('Title *', { exact: true }).fill('Old draft');
  try {
    const requested = page.waitForRequest(request => request.method() === 'PUT');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await requested;
    const cancelled = page.waitForEvent('requestfailed', request => request.method() === 'PUT');
    await page.evaluate(path => {
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }, `/books/${secondBook.id}`);
    await cancelled;
    await expect(page.getByRole('heading', { name: secondBook.title, exact: true })).toBeVisible();
  } finally {
    release();
  }
  await expect(page.getByRole('heading', { name: 'Old draft', exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit book', exact: true }).click();
  await expect(page.getByLabel('Title *', { exact: true })).toHaveValue(firstBook.title);
});

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1440]) {
    test(`editor remains accessible in ${theme} theme at ${width}px`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 1000 });
      await openEditor(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByLabel('Title *', { exact: true })).toHaveCSS('outline-style', 'solid');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('editor.png'), fullPage: true });
      await page.getByLabel('Description *', { exact: true }).fill('   ');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByLabel('Description *', { exact: true })).toHaveAccessibleDescription(
        'Enter a description.'
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('validation.png'), fullPage: true });
      await page.getByRole('button', { name: 'Cancel', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: firstBook.title, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit book', exact: true })).toBeFocused();
    });
  }
}
