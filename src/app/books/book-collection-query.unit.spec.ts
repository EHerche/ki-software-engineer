import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import {
  BookCollectionContext,
  collectionParams,
  readCollectionContext,
  sameCollectionContext
} from './book-collection-query';

const defaults: BookCollectionContext = {
  page: 1,
  searchText: '',
  searchField: 'all',
  publisher: '',
  sort: 'default'
};

describe('Unit: collection URL context', () => {
  it('uses defaults when no query parameters are present', () => {
    expect(readCollectionContext(convertToParamMap({}))).toEqual(defaults);
    expect(collectionParams(defaults)).toEqual({});
  });

  it.each(['0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992', ''])('normalizes invalid page %j', page => {
    expect(readCollectionContext(convertToParamMap({ page })).page).toBe(1);
  });

  it('preserves valid criteria while excluding unrelated or unsafe return parameters', () => {
    const context = { ...defaults, page: 3, searchText: 'A & B', searchField: 'title', publisher: 'Press', sort: 'pages-desc' } as const;
    const params = { ...collectionParams(context), returnUrl: 'https://example.invalid', extra: 'ignored' };
    expect(readCollectionContext(convertToParamMap(params))).toEqual(context);
    expect(collectionParams(readCollectionContext(convertToParamMap(params)))).toEqual(collectionParams(context));
    expect(collectionParams(context)).not.toHaveProperty('returnUrl');
  });

  it('normalizes unsupported fields and sorts without dropping search text', () => {
    expect(readCollectionContext(convertToParamMap({ searchField: 'cover', sort: 'random', searchText: 'Book' })))
      .toEqual({ ...defaults, searchText: 'Book' });
  });

  it.each(['title', 'author', 'isbn'])('retains supported search field %s', searchField => {
    expect(readCollectionContext(convertToParamMap({ searchField })).searchField).toBe(searchField);
  });

  it.each(['title-asc', 'title-desc', 'author-asc', 'pages-asc', 'pages-desc'])('retains supported sort %s', sort => {
    expect(readCollectionContext(convertToParamMap({ sort })).sort).toBe(sort);
  });

  it('compares context values rather than object identity', () => {
    expect(sameCollectionContext(defaults, { ...defaults })).toBe(true);
  });

  it.each([
    { page: 2 },
    { searchText: 'Book' },
    { searchField: 'title' as const },
    { publisher: 'Press' },
    { sort: 'title-asc' as const }
  ])('detects changed context %j', change => {
    expect(sameCollectionContext(defaults, { ...defaults, ...change })).toBe(false);
  });
});
