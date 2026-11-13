import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { convertToParamMap, NavigationStart } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleBook } from '../../../test-support/books';
import { apiUrl, screen } from '../../../test-support/screen';
import { BookListComponent } from './book-list.component';

const other = { ...sampleBook, id: 'other', title: 'Other book' };

describe('Integration: collection requests, filters and pagination', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows loading before the first response and renders an empty collection without an error', () => {
    const app = screen(BookListComponent);
    expect(app.host.textContent).toContain('Loading books...');
    const request = app.collection();
    expect(request.request.params.get('_limit')).toBe('10');
    request.flush([], { headers: { 'X-Total-Count': '0' } });
    app.render();
    expect(app.host.textContent).toContain('No books available');
  });

  it.each(['', 'Unknown'])('renders a successful empty collection/search %j', async searchText => {
    const app = screen(BookListComponent, {}, { searchText });
    app.respond([]);
    expect(app.host.textContent).toContain(searchText ? 'No books match your search' : 'No books available');
    expect(app.host.querySelector('[role="alert"]')).toBeNull();
    if (searchText) {
      app.fixture.componentInstance.clearSearch();
      app.respond([sampleBook]);
      expect(app.host.textContent).toContain(sampleBook.title);
    }
  });

  it.each([503, 0])('clears stale books on error %s and retries the current criteria', status => {
    const app = screen(BookListComponent, {}, { searchText: 'Angular', searchField: 'title', publisher: 'Press' });
    const request = app.collection();
    if (status) request.flush({}, { status, statusText: 'Failure' });
    else request.error(new ProgressEvent('error'));
    app.render();
    expect(app.host.textContent).toContain('Unable to load books');
    expect(app.host.querySelector('app-book-item')).toBeNull();
    app.fixture.componentInstance.retry();
    const retried = app.collection();
    expect(retried.request.params.get('title_like')).toBe('Angular');
    expect(retried.request.params.get('publisher_like')).toBe('Press');
    retried.flush([sampleBook], { headers: { 'X-Total-Count': '1' } });
    app.render();
    expect(app.host.textContent).toContain(sampleBook.title);
    expect(app.host.querySelector('[role="alert"]')).toBeNull();
  });

  it('debounces for 300ms, cancels the old request immediately and only sends the latest text', async () => {
    const app = screen(BookListComponent);
    app.respond([sampleBook]);
    vi.useFakeTimers();
    const controls = app.fixture.componentInstance.filters.controls;
    controls.searchTerm.setValue('Old');
    await vi.advanceTimersByTimeAsync(300);
    const old = app.collection();
    controls.searchTerm.setValue('Ang');
    expect(old.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    controls.searchTerm.setValue('Angular');
    await vi.advanceTimersByTimeAsync(299);
    app.http.expectNone(request => request.url === apiUrl);
    await vi.advanceTimersByTimeAsync(1);
    const current = app.collection();
    expect(current.request.params.get('q')).toBe('Angular');
    current.flush([sampleBook], { headers: { 'X-Total-Count': '1' } });
    app.render();
    expect(app.host.textContent).toContain(sampleBook.title);
    expect(() => old.flush([other])).toThrow(/cancelled/i);
  });

  it.each(['clear', 'reset', 'navigate'] as const)(
    '%s cancels pending debounce without a late duplicate read',
    async action => {
      const app = screen(BookListComponent);
      app.respond([sampleBook]);
      vi.useFakeTimers();
      app.fixture.componentInstance.filters.controls.searchTerm.setValue('Pending');
      await vi.advanceTimersByTimeAsync(200);
      if (action === 'clear') app.fixture.componentInstance.clearSearch();
      if (action === 'reset') app.fixture.componentInstance.resetFilters();
      if (action === 'navigate') app.events.next(new NavigationStart(1, '/books/other'));
      if (action !== 'navigate') app.respond([sampleBook]);
      await vi.advanceTimersByTimeAsync(1000);
      app.http.expectNone(request => request.url === apiUrl);
    }
  );

  it.each(['clear', 'page', 'navigate'] as const)('%s cancels active HTTP work', action => {
    const app = screen(BookListComponent);
    app.respond([sampleBook], 30);
    app.fixture.componentInstance.requestPage(2);
    const pending = app.collection();
    if (action === 'clear') app.fixture.componentInstance.clearSearch();
    if (action === 'page') app.fixture.componentInstance.requestPage(3);
    if (action === 'navigate') app.events.next(new NavigationStart(1, '/books/other'));
    expect(pending.cancelled).toBe(true);
    if (action !== 'navigate') app.respond([other], 30);
  });

  it('combines fields, publisher and sorting, resets page one, then resets all criteria', async () => {
    const app = screen(
      BookListComponent,
      {},
      { page: 2, searchText: 'Angular', searchField: 'title', publisher: 'Press', sort: 'pages-asc' }
    );
    app.respond([sampleBook], 23);
    app.fixture.componentInstance.filters.controls.sort.setValue('title-desc');
    const request = app.collection();
    expect(
      Object.fromEntries(request.request.params.keys().map(key => [key, request.request.params.get(key)]))
    ).toEqual({
      _limit: '10',
      _page: '1',
      title_like: 'Angular',
      publisher_like: 'Press',
      _sort: 'title,id',
      _order: 'desc,asc'
    });
    request.flush([sampleBook], { headers: { 'X-Total-Count': '23' } });
    app.render();
    app.fixture.componentInstance.resetFilters();
    const reset = app.collection();
    expect(reset.request.params.keys().sort()).toEqual(['_limit', '_page']);
    reset.flush([sampleBook], { headers: { 'X-Total-Count': '1' } });
    expect(app.fixture.componentInstance.filters.getRawValue()).toEqual({
      searchTerm: '',
      searchField: 'all',
      publisher: '',
      sort: 'default'
    });
  });

  it.each(['button', 'empty input'])('clears search with %s while preserving the publisher filter', async action => {
    const app = screen(BookListComponent, {}, { searchText: 'Angular', searchField: 'title', publisher: 'Press' });
    app.respond([sampleBook]);
    if (action === 'button') app.fixture.componentInstance.clearSearch();
    else {
      vi.useFakeTimers();
      app.fixture.componentInstance.filters.controls.searchTerm.setValue('');
      await vi.advanceTimersByTimeAsync(300);
    }
    const request = app.collection();
    expect(request.request.params.has('title_like')).toBe(false);
    expect(request.request.params.get('publisher_like')).toBe('Press');
    request.flush([], { headers: { 'X-Total-Count': '0' } });
    app.render();
    expect(app.host.textContent).toContain('No books match your search');
    expect(app.fixture.componentInstance.filters.controls.publisher.value).toBe('Press');
  });

  it('corrects a shrunken collection once and rejects invalid pagination metadata', () => {
    const app = screen(BookListComponent, {}, { page: 5 });
    app.respond([], 12);
    const correction = app.collection();
    expect(correction.request.params.get('_page')).toBe('2');
    correction.flush([sampleBook], { headers: { 'X-Total-Count': '12' } });
    app.render();
    expect(app.host.textContent).toContain('Page 2 of 2');
    app.fixture.componentInstance.retry();
    app.collection().flush([]);
    app.render();
    expect(app.host.textContent).toContain('Unable to load books');
  });

  it('ignores URL echoes but reacts once to a different route query and cancels on destruction', () => {
    const app = screen(BookListComponent);
    app.respond([sampleBook]);
    app.routeQuery.next(convertToParamMap({}));
    app.http.expectNone(request => request.url === apiUrl);
    app.routeQuery.next(convertToParamMap({ page: '2', searchText: 'Other' }));
    const pending = app.collection();
    expect(pending.request.params.get('q')).toBe('Other');
    expect(pending.request.params.get('_page')).toBe('2');
    app.fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
