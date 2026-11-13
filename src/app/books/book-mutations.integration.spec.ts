import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BookFormComponent } from './book-form.component';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleBook, sampleDraft } from '../../../test-support/books';
import { element, labelledField } from '../../../test-support/dom';
import { apiUrl, screen } from '../../../test-support/screen';
import { BookCreateComponent } from './book-create.component';
import { BookEditComponent } from './book-edit.component';

describe('Integration: real forms, mutation containers and HTTP', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it.each(['', '   '])('rejects invalid create fields %j then submits normalized corrected values', async value => {
    const app = screen(BookCreateComponent);
    for (const label of ['ISBN *', 'Title *', 'Publisher *', 'Description *']) app.fill(label, value);
    await app.submit();
    app.http.expectNone(request => request.url === apiUrl);
    for (const label of ['ISBN *', 'Title *', 'Publisher *', 'Description *']) {
      expect(labelledField(app.host, label).getAttribute('aria-invalid')).toBe('true');
    }
    for (const [label, text] of [
      ['ISBN *', 'ISBN'],
      ['Title *', 'Title'],
      ['Publisher *', 'Press'],
      ['Description *', 'Description']
    ])
      app.fill(label, text);
    await app.submit();
    const request = app.http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      isbn: 'ISBN',
      title: 'Title',
      publisher: 'Press',
      abstract: 'Description',
      subtitle: '',
      author: '',
      numPages: 0,
      price: '',
      cover: ''
    });
    request.flush({ ...sampleBook, id: 'server-id' });
    app.render();
    expect(app.navigateCommands).toHaveBeenCalledWith(['/books', 'server-id']);
  });

  it.each([400, 500, 0])(
    'retains a failed create draft after %s, blocks duplicate POST and retries deliberately',
    async status => {
      const app = screen(BookCreateComponent);
      for (const [label, value] of [
        ['ISBN *', sampleDraft.isbn],
        ['Title *', sampleDraft.title],
        ['Publisher *', sampleDraft.publisher],
        ['Description *', sampleDraft.abstract]
      ])
        app.fill(label, value);
      await app.submit();
      const first = app.http.expectOne(apiUrl);
      expect(element<HTMLFieldSetElement>(app.host, 'fieldset').disabled).toBe(true);
      app.fixture.componentInstance.create(sampleDraft);
      app.http.expectNone(request => request.url === apiUrl);
      if (status) first.flush({}, { status, statusText: 'Failure' });
      else first.error(new ProgressEvent('error'));
      app.render();
      await app.fixture.whenStable();
      app.render();
      expect(app.host.querySelector('[role="alert"]')).not.toBeNull();
      expect(labelledField(app.host, 'Title *').value).toBe(sampleDraft.title);
      const form = app.fixture.debugElement.query(By.directive(BookFormComponent))
        .componentInstance as BookFormComponent;
      await vi.waitFor(() => expect(form.form().submitting()).toBe(false));
      await app.submit();
      app.http.expectOne(apiUrl).flush(sampleBook);
      app.render();
      expect(app.navigateCommands).toHaveBeenCalledWith(['/books', sampleBook.id]);
    }
  );

  it('cancels a pending POST when the create screen is destroyed and cancel never writes', () => {
    const app = screen(BookCreateComponent);
    app.fixture.componentInstance.cancel();
    expect(app.navigateCommands).toHaveBeenCalledWith(['/']);
    app.http.expectNone(request => request.url === apiUrl);
    app.fixture.componentInstance.create(sampleDraft);
    const pending = app.http.expectOne(apiUrl);
    app.fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });

  it.each([400, 503, 0])(
    'retains edited form values after %s and emits saved only after a successful retry',
    async status => {
      const app = screen(BookEditComponent, {}, {}, { book: sampleBook });
      const saved = vi.fn();
      app.fixture.componentInstance.saved.subscribe(saved);
      app.fill('Title *', 'Revised title');
      await app.submit();
      const first = app.http.expectOne(`${apiUrl}/${sampleBook.id}`);
      expect(first.request.method).toBe('PUT');
      expect(first.request.body).toEqual({ ...sampleBook, title: 'Revised title' });
      app.fixture.componentInstance.save(sampleDraft);
      app.http.expectNone(request => request.url.startsWith(apiUrl));
      if (status) first.flush({}, { status, statusText: 'Failure' });
      else first.error(new ProgressEvent('error'));
      app.render();
      await app.fixture.whenStable();
      app.render();
      expect(saved).not.toHaveBeenCalled();
      expect(labelledField(app.host, 'Title *').value).toBe('Revised title');
      expect(app.host.querySelector('[role="alert"]')).not.toBeNull();
      const form = app.fixture.debugElement.query(By.directive(BookFormComponent))
        .componentInstance as BookFormComponent;
      await vi.waitFor(() => expect(form.form().submitting()).toBe(false));
      await app.submit();
      app.http.expectOne(`${apiUrl}/${sampleBook.id}`).flush({ ...sampleBook, title: 'Revised title' });
      app.render();
      expect(saved).toHaveBeenCalledExactlyOnceWith({ ...sampleBook, title: 'Revised title' });
    }
  );

  it.each(['', '   '])('prevents an invalid edit %j from reaching HTTP', async value => {
    const app = screen(BookEditComponent, {}, {}, { book: sampleBook });
    for (const label of ['Title *', 'Publisher *', 'Description *']) app.fill(label, value);
    await app.submit();
    app.http.expectNone(request => request.url.startsWith(apiUrl));
    expect(labelledField(app.host, 'Title *').getAttribute('aria-invalid')).toBe('true');
  });

  it('emits cancel without PUT and unsubscribes a pending save on editor destruction', async () => {
    const app = screen(BookEditComponent, {}, {}, { book: sampleBook });
    const cancelled = vi.fn();
    app.fixture.componentInstance.cancelled.subscribe(cancelled);
    element<HTMLButtonElement>(app.host, 'button[type="button"]').click();
    expect(cancelled).toHaveBeenCalledOnce();
    app.http.expectNone(request => request.url.startsWith(apiUrl));
    await app.submit();
    const pending = app.http.expectOne(`${apiUrl}/${sampleBook.id}`);
    app.fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
