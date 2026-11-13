import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleBook } from '../../../test-support/books';
import { apiUrl, screen } from '../../../test-support/screen';
import { BookDetailsComponent } from './book-details.component';

describe('Integration: details state and route lifecycle', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('renders loading followed by the full book without duplicate reads for the same ID', () => {
    const app = screen(BookDetailsComponent, { id: sampleBook.id });
    expect(app.host.textContent).toContain('Loading book...');
    app.http.expectOne(`${apiUrl}/${sampleBook.id}`).flush(sampleBook);
    app.render();
    for (const value of [
      sampleBook.title,
      sampleBook.author,
      sampleBook.isbn,
      sampleBook.publisher,
      sampleBook.abstract,
      sampleBook.price,
      String(sampleBook.numPages)
    ]) {
      expect(app.host.textContent).toContain(value);
    }
    app.routeParams.next(convertToParamMap({ id: sampleBook.id }));
    app.http.expectNone(request => request.url.startsWith(apiUrl));
  });

  it('shows not found without issuing HTTP when the route has no ID', () => {
    const app = screen(BookDetailsComponent);
    expect(app.host.textContent).toContain('Book not found');
    app.http.expectNone(request => request.url.startsWith(apiUrl));
  });

  it.each([404, 503, 0])('distinguishes %s failures and permits explicit retry', status => {
    const app = screen(BookDetailsComponent, { id: sampleBook.id });
    const request = app.http.expectOne(`${apiUrl}/${sampleBook.id}`);
    if (status) request.flush({}, { status, statusText: 'Failure' });
    else request.error(new ProgressEvent('error'));
    app.render();
    expect(app.host.textContent).toContain(status === 404 ? 'Book not found' : 'Unable to load book');
    app.fixture.componentInstance.retry();
    app.http.expectOne(`${apiUrl}/${sampleBook.id}`).flush(sampleBook);
    app.render();
    expect(app.host.textContent).toContain(sampleBook.title);
  });

  it('cancels an old ID, discards its draft and cancels a new pending read on destruction', () => {
    const app = screen(BookDetailsComponent, { id: 'old' });
    const old = app.http.expectOne(`${apiUrl}/old`);
    app.routeParams.next(convertToParamMap({ id: sampleBook.id }));
    expect(old.cancelled).toBe(true);
    app.http.expectOne(`${apiUrl}/${sampleBook.id}`).flush(sampleBook);
    app.fixture.componentInstance.edit();
    app.render();
    expect(app.host.textContent).toContain('Edit book');
    app.routeParams.next(convertToParamMap({ id: 'other' }));
    app.render();
    expect(app.host.textContent).not.toContain('Save changes');
    const next = app.http.expectOne(`${apiUrl}/other`);
    app.fixture.destroy();
    expect(next.cancelled).toBe(true);
  });

  it('updates the return context without refetching and handles edit/cancel/saved actions', () => {
    const app = screen(BookDetailsComponent, { id: sampleBook.id });
    app.http.expectOne(`${apiUrl}/${sampleBook.id}`).flush(sampleBook);
    app.fixture.componentInstance.edit();
    app.render();
    expect(app.host.textContent).toContain('Save changes');
    app.fixture.componentInstance.cancelEdit();
    app.render();
    expect(app.host.textContent).toContain(sampleBook.title);
    app.fixture.componentInstance.bookSaved({ ...sampleBook, title: 'Revised title' });
    app.render();
    expect(app.host.textContent).toContain('Revised title');
    app.routeQuery.next(convertToParamMap({ page: 3, searchText: 'Book', searchField: 'title' }));
    app.render();
    expect(app.host.querySelector('a')?.getAttribute('href')).toBe('/?page=3&searchText=Book&searchField=title');
    app.http.expectNone(request => request.url.startsWith(apiUrl));
  });
});
