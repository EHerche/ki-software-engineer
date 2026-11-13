import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  Event as RouterEvent,
  Params,
  provideRouter,
  Router
} from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Book } from '../src/app/books/book';
import { element, labelledField } from './dom';

export const apiUrl = 'http://localhost:4730/books';

// Render real components/forms and use the real API client against Angular's HTTP
// adapter. Only route changes/navigation are controlled here; browser history is
// deliberately left to Playwright.
export function screen<T>(
  component: Type<T>,
  params: Params = {},
  query: Params = {},
  inputs: Record<string, unknown> = {}
) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  });
  const router = TestBed.inject(Router);
  const route = TestBed.inject(ActivatedRoute);
  const routeParams = new BehaviorSubject(convertToParamMap(params));
  const routeQuery = new BehaviorSubject(convertToParamMap(query));
  const events = new Subject<RouterEvent>();
  vi.spyOn(route, 'paramMap', 'get').mockReturnValue(routeParams);
  vi.spyOn(route, 'queryParamMap', 'get').mockReturnValue(routeQuery);
  vi.spyOn(route.snapshot, 'queryParamMap', 'get').mockReturnValue(convertToParamMap(query));
  vi.spyOn(router, 'events', 'get').mockReturnValue(events);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const navigateCommands = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  const host = fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  render();

  return {
    fixture,
    host,
    http,
    router,
    navigate,
    navigateCommands,
    routeParams,
    routeQuery,
    events,
    render,
    collection() {
      return http.expectOne(request => request.url === apiUrl && request.method === 'GET');
    },
    respond(books: Book[], total = books.length) {
      this.collection().flush(books, { headers: { 'X-Total-Count': String(total) } });
      render();
    },
    fill(label: string, value: string) {
      const field = labelledField(host, label);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      render();
    },
    async submit() {
      element(host, 'form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
      render();
    }
  };
}
