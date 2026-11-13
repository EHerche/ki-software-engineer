import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { element } from '../../../test-support/dom';
import { BookCoverComponent } from './book-cover.component';

describe('Component: book cover', () => {
  let fixture: ComponentFixture<BookCoverComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BookCoverComponent);
    fixture.componentRef.setInput('title', 'A book');
    fixture.componentRef.setInput('cover', 'https://example.invalid/first.svg');
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders the provided URL with an accessible title', () => {
    const image = element<HTMLImageElement>(host, 'img');
    expect(image.getAttribute('src')).toBe('https://example.invalid/first.svg');
    expect(image.alt).toBe('Cover of A book');
  });

  it('shows a fallback without an image for a missing cover', () => {
    fixture.componentRef.setInput('cover', '');
    fixture.detectChanges();
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('No cover available');
  });

  it('replaces a failed image with the fallback', () => {
    element(host, 'img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('No cover available');
  });

  it('recovers in the same component when a replacement cover arrives', () => {
    element(host, 'img').dispatchEvent(new Event('error'));
    fixture.detectChanges();
    fixture.componentRef.setInput('cover', 'https://example.invalid/replacement.svg');
    fixture.componentRef.setInput('title', 'Revised book');
    fixture.detectChanges();
    expect(element<HTMLImageElement>(host, 'img').alt).toBe('Cover of Revised book');
    expect(element(host, 'img').getAttribute('src')).toBe('https://example.invalid/replacement.svg');
    expect(host.textContent).not.toContain('No cover available');
  });
});
