import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBook } from '../../../test-support/books';
import { element } from '../../../test-support/dom';
import { BookItemComponent } from './book-item.component';

describe('Component: shelf book item', () => {
  let fixture: ComponentFixture<BookItemComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BookItemComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('book', sampleBook);
    fixture.componentRef.setInput('collectionQuery', { page: 2, searchText: 'Angular' });
    fixture.detectChanges();
  });

  it('renders a details link retaining collection context', () => {
    const link = element<HTMLAnchorElement>(host, 'h2 a');
    expect(link.textContent).toBe(sampleBook.title);
    expect(link.getAttribute('href')).toBe(`/books/${sampleBook.id}?page=2&searchText=Angular`);
    expect(host.textContent).toContain(sampleBook.author);
  });

  it('emits the originating selection event for the parent to manage', () => {
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    const event = new MouseEvent('click', { bubbles: true });
    element(host, 'button').dispatchEvent(event);
    expect(selected).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('reflects parent selection in the accessible expanded state', () => {
    expect(element(host, 'button').getAttribute('aria-expanded')).toBe('false');
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    expect(element(host, 'button').getAttribute('aria-expanded')).toBe('true');
    expect(element(host, 'button').getAttribute('aria-label')).toBe(`Preview ${sampleBook.title}`);
  });
});
