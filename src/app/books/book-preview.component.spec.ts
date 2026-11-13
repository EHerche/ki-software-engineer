import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBook } from '../../../test-support/books';
import { element } from '../../../test-support/dom';
import { BookPreviewComponent } from './book-preview.component';

describe('Component: book preview dialog', () => {
  let fixture: ComponentFixture<BookPreviewComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BookPreviewComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('book', sampleBook);
    fixture.componentRef.setInput('collectionQuery', { page: 2, publisher: 'Press' });
    fixture.detectChanges();
  });

  it('renders an accessible dialog and a context-preserving details link', () => {
    const dialog = element(host, '[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element(host, 'h2').textContent).toBe(sampleBook.title);
    expect(element(host, 'a').getAttribute('href')).toBe(`/books/${sampleBook.id}?page=2&publisher=Press`);
  });

  it('recomputes the truncated description when a different book arrives', () => {
    fixture.componentRef.setInput('book', { ...sampleBook, abstract: 'x'.repeat(310) });
    fixture.detectChanges();
    expect(fixture.componentInstance.shortDescription()).toBe('x'.repeat(300));
    fixture.componentRef.setInput('book', { ...sampleBook, abstract: 'Short description' });
    fixture.detectChanges();
    expect(host.textContent).toContain('Short description');
    expect(host.textContent).not.toContain('x'.repeat(300));
  });

  it('keeps content clicks inside the dialog and closes on the button or backdrop', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    element<HTMLElement>(host, '[role="dialog"]').click();
    expect(closed).not.toHaveBeenCalled();
    element<HTMLButtonElement>(host, 'button[aria-label="Close preview"]').click();
    expect(closed).toHaveBeenCalledTimes(1);
    element<HTMLElement>(host, 'div').click();
    expect(closed).toHaveBeenCalledTimes(2);
  });

  it('emits close and prevents the default Escape action', () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    element(host, '[role="dialog"]').dispatchEvent(event);
    expect(closed).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('shows reroll only for roulette and emits its event', () => {
    expect(host.textContent).not.toContain('Das Schicksal herausfordern');
    fixture.componentRef.setInput('roulette', true);
    fixture.detectChanges();
    const reroll = vi.fn();
    fixture.componentInstance.reroll.subscribe(reroll);
    const buttons = host.querySelectorAll<HTMLButtonElement>('button');
    buttons[buttons.length - 1].click();
    expect(reroll).toHaveBeenCalledOnce();
  });

  it.each([false, true])('wraps keyboard focus at both dialog boundaries (roulette=%s)', roulette => {
    fixture.componentRef.setInput('roulette', roulette);
    fixture.detectChanges();
    const dialog = element(host, '[role="dialog"]');
    const controls = dialog.querySelectorAll<HTMLElement>('button, a[href]');
    const first = controls[0];
    const last = controls[controls.length - 1];
    fixture.componentInstance.focusCloseButton();
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
  });
});
