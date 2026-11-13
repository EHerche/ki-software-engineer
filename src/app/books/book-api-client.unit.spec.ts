import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleBook, sampleDraft } from '../../../test-support/books';
import { BookApiClient, BookChanges, BookSearchField, BookSort } from './book-api-client.service';

const apiUrl = 'http://localhost:4730/books';

describe('Unit: BookApiClient with an isolated HTTP backend', () => {
  let client: BookApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(BookApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not request until subscribed and uses the default collection limit', async () => {
    const result = client.getBooks();
    http.expectNone(() => true);
    const response = firstValueFrom(result);
    const request = http.expectOne(`${apiUrl}?_limit=10`);
    expect(request.request.method).toBe('GET');
    request.flush([sampleBook]);
    expect(await response).toEqual([sampleBook]);
  });

  it('trims full-text search and omits blank publisher and default sorting', async () => {
    const response = firstValueFrom(client.getBooks(5, ' Angular ', { field: 'all', publisher: '  ', sort: 'default' }));
    const request = http.expectOne(request => request.url === apiUrl);
    expect(request.request.params.keys()).toEqual(['_limit', 'q']);
    expect(request.request.params.get('_limit')).toBe('5');
    expect(request.request.params.get('q')).toBe('Angular');
    request.flush([]);
    expect(await response).toEqual([]);
  });

  it.each(['title', 'author', 'isbn'] as BookSearchField[])('escapes literal %s and publisher searches', async field => {
    const response = firstValueFrom(client.getBooks(10, ' Ada [Reader]. ', { field, publisher: ' Press (A) ', sort: 'default' }));
    const request = http.expectOne(request => request.url === apiUrl);
    expect(request.request.params.get(`${field}_like`)).toBe('Ada \\[Reader\\]\\.');
    expect(request.request.params.get('publisher_like')).toBe('Press \\(A\\)');
    expect(request.request.params.has('q')).toBe(false);
    request.flush([]);
    await response;
  });

  it.each([
    ['title-asc', 'title', 'asc'],
    ['title-desc', 'title', 'desc'],
    ['author-asc', 'author', 'asc'],
    ['pages-asc', 'numPages', 'asc'],
    ['pages-desc', 'numPages', 'desc']
  ] as const)('adds a stable ID tie-breaker for %s', async (sort: BookSort, field, order) => {
    const response = firstValueFrom(client.getBooks(10, '', { field: 'all', publisher: '', sort }));
    const request = http.expectOne(request => request.url === apiUrl);
    expect(request.request.params.get('_sort')).toBe(`${field},id`);
    expect(request.request.params.get('_order')).toBe(`${order},asc`);
    expect(request.request.params.has('q')).toBe(false);
    request.flush([]);
    await response;
  });

  it('returns the server total alongside the requested page and size', async () => {
    const response = firstValueFrom(client.getBooksPage({ page: 2, pageSize: 10 }));
    const request = http.expectOne(`${apiUrl}?_limit=10&_page=2`);
    request.flush([sampleBook], { headers: { 'X-Total-Count': '23' } });
    expect(await response).toEqual({ books: [sampleBook], page: 2, pageSize: 10, total: 23 });
  });

  it('accepts a valid empty collection with a zero total', async () => {
    const response = firstValueFrom(client.getBooksPage({ page: 1, pageSize: 10 }));
    http.expectOne(`${apiUrl}?_limit=10&_page=1`).flush([], { headers: { 'X-Total-Count': '0' } });
    expect(await response).toEqual({ books: [], page: 1, pageSize: 10, total: 0 });
  });

  it.each([null, '', '-1', '1.5', '3junk', '9007199254740992'])('rejects invalid total metadata %j', async total => {
    const response = firstValueFrom(client.getBooksPage({ page: 1, pageSize: 10 }));
    const rejected = expect(response).rejects.toThrow('valid total count and books array');
    const headers: Record<string, string> = total === null ? {} : { 'X-Total-Count': total };
    http.expectOne(`${apiUrl}?_limit=10&_page=1`).flush([], { headers });
    await rejected;
  });

  it('rejects a non-array collection response despite a valid count', async () => {
    const response = firstValueFrom(client.getBooksPage({ page: 1, pageSize: 10 }));
    const rejected = expect(response).rejects.toThrow('valid total count and books array');
    http.expectOne(`${apiUrl}?_limit=10&_page=1`).flush({ books: [] }, { headers: { 'X-Total-Count': '0' } });
    await rejected;
  });

  it('URL-encodes a detail ID as a single path segment', async () => {
    const id = 'id/with ?#';
    const response = firstValueFrom(client.getBook(id));
    http.expectOne(`${apiUrl}/${encodeURIComponent(id)}`).flush(sampleBook);
    expect(await response).toEqual(sampleBook);
  });

  it('creates only user-editable fields and uses the server identity', async () => {
    const input = { ...sampleDraft, id: 'tampered', userId: 99 };
    const response = firstValueFrom(client.createBook(input));
    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(sampleDraft);
    request.flush(sampleBook, { status: 201, statusText: 'Created' });
    expect(await response).toEqual(sampleBook);
  });

  it('updates editable fields while preserving original identity and extra metadata', async () => {
    const original = { ...sampleBook, serverMetadata: 'keep me' };
    const { isbn: _isbn, ...editable } = sampleDraft;
    const changes: BookChanges & { id: string; isbn: string; userId: number } = {
      ...editable, title: 'Revised', id: 'tampered', isbn: 'tampered', userId: 99
    };
    const response = firstValueFrom(client.updateBook(original, changes));
    const request = http.expectOne(`${apiUrl}/${sampleBook.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ...original, title: 'Revised' });
    expect(original).toEqual({ ...sampleBook, serverMetadata: 'keep me' });
    request.flush(request.request.body);
    expect(await response).toEqual({ ...original, title: 'Revised' });
  });

  it.each([404, 503])('propagates HTTP %s so callers can distinguish missing books and failures', async status => {
    const response = firstValueFrom(client.getBook('missing'));
    const rejected = expect(response).rejects.toMatchObject({ status });
    http.expectOne(`${apiUrl}/missing`).flush({}, { status, statusText: 'Failure' });
    await rejected;
  });
});
