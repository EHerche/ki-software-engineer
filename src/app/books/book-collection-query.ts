import { ParamMap } from '@angular/router';
import { BookSearchField, BookSort } from './book-api-client.service';

export interface BookCollectionContext {
  page: number;
  searchText: string;
  searchField: BookSearchField;
  publisher: string;
  sort: BookSort;
}

export interface BookCollectionParams {
  page?: number;
  searchText?: string;
  searchField?: BookSearchField;
  publisher?: string;
  sort?: BookSort;
}

export function readCollectionContext(params: ParamMap): BookCollectionContext {
  const page = Number(params.get('page') ?? 1);
  const field = params.get('searchField');
  const sort = params.get('sort');
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    searchText: params.get('searchText') ?? '',
    searchField: field === 'title' || field === 'author' || field === 'isbn' ? field : 'all',
    publisher: params.get('publisher') ?? '',
    sort:
      sort === 'title-asc' ||
      sort === 'title-desc' ||
      sort === 'author-asc' ||
      sort === 'pages-asc' ||
      sort === 'pages-desc'
        ? sort
        : 'default'
  };
}

export function collectionParams(context: BookCollectionContext): BookCollectionParams {
  return {
    ...(context.page > 1 ? { page: context.page } : {}),
    ...(context.searchText ? { searchText: context.searchText } : {}),
    ...(context.searchField !== 'all' ? { searchField: context.searchField } : {}),
    ...(context.publisher ? { publisher: context.publisher } : {}),
    ...(context.sort !== 'default' ? { sort: context.sort } : {})
  };
}

export const sameCollectionContext = (left: BookCollectionContext, right: BookCollectionContext): boolean =>
  left.page === right.page &&
  left.searchText === right.searchText &&
  left.searchField === right.searchField &&
  left.publisher === right.publisher &&
  left.sort === right.sort;
