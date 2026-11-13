import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { element } from '../../../test-support/dom';
import { BookPaginationComponent } from './book-pagination.component';

describe('Component: collection pagination', () => {
  let fixture: ComponentFixture<BookPaginationComponent>;
  let host: HTMLElement;
  const button = (name: string) => element<HTMLButtonElement>(host, `button[aria-label="${name} page"]`);

  beforeEach(() => {
    fixture = TestBed.createComponent(BookPaginationComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', 23);
    fixture.detectChanges();
  });

  it('shows the rounded-up total and disables Previous on page one', () => {
    expect(host.textContent).toContain('Page 1 of 3');
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(false);
  });

  it('emits the requested page without mutating its parent input', () => {
    const requested = vi.fn();
    fixture.componentInstance.pageRequested.subscribe(requested);
    button('Next').click();
    expect(requested).toHaveBeenCalledExactlyOnceWith(2);
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('disables Next at the last page and emits the previous page', () => {
    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    const requested = vi.fn();
    fixture.componentInstance.pageRequested.subscribe(requested);
    button('Next').click();
    expect(requested).not.toHaveBeenCalled();
    expect(button('Next').disabled).toBe(true);
    button('Previous').click();
    expect(requested).toHaveBeenCalledExactlyOnceWith(2);
  });

  it.each([0, 10])('shows one page with both boundaries disabled for total %s', total => {
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    expect(host.textContent).toContain('Page 1 of 1');
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(true);
  });

  it('recomputes the total when page size changes', () => {
    fixture.componentRef.setInput('pageSize', 5);
    fixture.detectChanges();
    expect(host.textContent).toContain('Page 1 of 5');
  });
});
