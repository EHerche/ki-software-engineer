import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationStart } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleBook } from '../../../test-support/books';
import { apiUrl, screen } from '../../../test-support/screen';
import { BookListComponent } from './book-list.component';

const books = Array.from({ length: 23 }, (_, index) => ({
  ...sampleBook,
  id: `book-${index}`,
  title: `Book ${index}`
}));

describe('Integration: roulette candidate traversal and state', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it.each([false, true])('loads all filtered pages and preserves the chosen mode (animated=%s)', animate => {
    const app = screen(
      BookListComponent,
      {},
      { searchText: 'Book', searchField: 'title', publisher: 'Press', sort: 'pages-asc' }
    );
    app.respond(books.slice(0, 10), 23);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const list = app.fixture.componentInstance;
    list.startRoulette(undefined, animate);
    for (let page = 1; page <= 3; page++) {
      const request = app.collection();
      expect(request.request.params.get('_page')).toBe(String(page));
      expect(request.request.params.get('title_like')).toBe('Book');
      expect(request.request.params.get('publisher_like')).toBe('Press');
      expect(request.request.params.get('_sort')).toBe('numPages,id');
      request.flush(books.slice((page - 1) * 10, page * 10), { headers: { 'X-Total-Count': '23' } });
    }
    expect(list.cubeBooks()).toHaveLength(6);
    expect(list.cubeBooks()[0].id).toBe('book-22');
    expect(list.rouletteRunning()).toBe(animate);
    if (animate) {
      expect(list.selectedBook()).toBeNull();
      const target = document.createElement('div');
      list.onRouletteAnimationEnd({
        target,
        currentTarget: target,
        animationName: 'roulette-roll'
      } as unknown as AnimationEvent);
    }
    expect(list.selectedBook()?.id).toBe('book-22');
    expect(list.rouletteStatus()).toContain('Book 22');
    expect(list.rouletteLoading()).toBe(false);
  });

  it.each(['failure', 'changed total', 'empty page'] as const)(
    'does not draw from partial candidates after %s and retries from page one',
    failure => {
      const app = screen(BookListComponent);
      app.respond(books.slice(0, 10), 23);
      const list = app.fixture.componentInstance;
      list.startRoulette(undefined, false);
      app.respond(books.slice(0, 10), 23);
      const second = app.collection();
      if (failure === 'failure') second.flush({}, { status: 503, statusText: 'Failure' });
      else
        second.flush(failure === 'empty page' ? [] : books.slice(10, 20), {
          headers: { 'X-Total-Count': failure === 'changed total' ? '24' : '23' }
        });
      expect(list.rouletteError()).toBe(true);
      expect(list.selectedBook()).toBeNull();
      list.retryRoulette();
      const retry = app.collection();
      expect(retry.request.params.get('_page')).toBe('1');
      retry.flush([sampleBook], { headers: { 'X-Total-Count': '1' } });
      expect(list.selectedBook()?.id).toBe(sampleBook.id);
    }
  );

  it.each(['search', 'page', 'navigate', 'preview', 'destroy'] as const)(
    '%s cancels candidate loading without a late result',
    action => {
      const app = screen(BookListComponent);
      app.respond(books.slice(0, 10), 23);
      const list = app.fixture.componentInstance;
      list.startRoulette(undefined, false);
      const pending = app.collection();
      list.startRoulette(undefined, false);
      app.http.expectNone(request => request.url === apiUrl);
      if (action === 'search') list.clearSearch();
      if (action === 'page') list.requestPage(2);
      if (action === 'navigate') app.events.next(new NavigationStart(1, '/books/other'));
      if (action === 'preview') list.openPreview(sampleBook, new Event('click'));
      if (action === 'destroy') app.fixture.destroy();
      expect(pending.cancelled).toBe(true);
      expect(list.rouletteLoading()).toBe(false);
      expect(list.rouletteRunning()).toBe(false);
      if (action === 'search' || action === 'page') app.respond([sampleBook], 23);
      if (action !== 'preview') expect(list.selectedBook()).toBeNull();
      else expect(list.selectedBook()).toEqual(sampleBook);
    }
  );

  it.each([1, 2])('rerolls %s candidate(s) without an avoidable immediate duplicate', count => {
    const app = screen(BookListComponent);
    const candidates = books.slice(0, count);
    app.respond(candidates);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const list = app.fixture.componentInstance;
    list.startRoulette(undefined, false);
    app.respond(candidates);
    const first = list.selectedBook()?.id;
    list.startRoulette();
    app.respond(candidates);
    if (count === 1) expect(list.selectedBook()?.id).toBe(first);
    else expect(list.selectedBook()?.id).not.toBe(first);
  });

  it('ignores bubbled/unrelated animation events and completes only its own roll', () => {
    const app = screen(BookListComponent);
    app.respond([sampleBook]);
    const list = app.fixture.componentInstance;
    list.startRoulette(undefined, true);
    app.respond([sampleBook]);
    const cube = document.createElement('div');
    const child = document.createElement('span');
    for (const [target, animationName] of [
      [child, 'roulette-roll'],
      [cube, 'unrelated']
    ] as const) {
      list.onRouletteAnimationEnd({ target, currentTarget: cube, animationName } as unknown as AnimationEvent);
      expect(list.rouletteRunning()).toBe(true);
      expect(list.selectedBook()).toBeNull();
    }
    list.onRouletteAnimationEnd({
      target: cube,
      currentTarget: cube,
      animationName: 'roulette-roll'
    } as unknown as AnimationEvent);
    expect(list.selectedBook()).toEqual(sampleBook);
  });

  it('deduplicates candidate IDs before random selection', () => {
    const app = screen(BookListComponent);
    app.respond([books[0], books[1]]);
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    app.fixture.componentInstance.startRoulette(undefined, false);
    app.respond([books[0], books[0], books[1]], 3);
    expect(app.fixture.componentInstance.selectedBook()?.id).toBe(books[1].id);
  });

  it.each(['page', 'search', 'preview'] as const)(
    '%s clears an already animated selection with no late dialog',
    action => {
      const app = screen(BookListComponent);
      app.respond(books.slice(0, 10), 23);
      const list = app.fixture.componentInstance;
      list.startRoulette(undefined, true);
      app.respond([sampleBook], 1);
      expect(list.rouletteRunning()).toBe(true);
      if (action === 'page') list.requestPage(2);
      if (action === 'search') list.clearSearch();
      if (action === 'preview') list.openPreview(books[0], new Event('click'));
      if (action !== 'preview') app.respond([books[0]], 23);
      const target = document.createElement('div');
      list.onRouletteAnimationEnd({
        target,
        currentTarget: target,
        animationName: 'roulette-roll'
      } as unknown as AnimationEvent);
      expect(list.rouletteRunning()).toBe(false);
      expect(list.rouletteStatus()).toBe('');
      if (action === 'preview') expect(list.selectedBook()?.id).toBe(books[0].id);
      else expect(list.selectedBook()).toBeNull();
    }
  );
});
