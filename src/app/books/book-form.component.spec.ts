import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleDraft } from '../../../test-support/books';
import { element, labelledField } from '../../../test-support/dom';
import { BookFormComponent } from './book-form.component';

describe('Component: shared book form', () => {
  let fixture: ComponentFixture<BookFormComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BookFormComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('initialValue', { ...sampleDraft });
    fixture.detectChanges();
  });

  async function fill(label: string, value: string): Promise<void> {
    const input = labelledField(host, label);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function submit(): Promise<Event> {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    element(host, 'form').dispatchEvent(event);
    await fixture.whenStable();
    fixture.detectChanges();
    return event;
  }

  it('renders supplied create values and editable ISBN without showing errors initially', () => {
    expect(labelledField(host, 'ISBN *').value).toBe(sampleDraft.isbn);
    expect(labelledField(host, 'Title *').value).toBe(sampleDraft.title);
    expect(labelledField(host, 'ISBN *').readOnly).toBe(false);
    expect(labelledField(host, 'Title *').getAttribute('aria-invalid')).toBe('false');
    expect(host.textContent).not.toContain('Enter a title.');
    for (const [label, value] of [
      ['Subtitle', sampleDraft.subtitle],
      ['Author', sampleDraft.author],
      ['Publisher *', sampleDraft.publisher],
      ['Pages', String(sampleDraft.numPages)],
      ['Price', sampleDraft.price],
      ['Cover URL', sampleDraft.cover],
      ['Description *', sampleDraft.abstract]
    ]) {
      expect(labelledField(host, label).value).toBe(value);
    }
  });

  it.each(['', '   '])('shows required errors and does not emit an invalid submission %j', async value => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    for (const label of ['ISBN *', 'Title *', 'Publisher *', 'Description *']) await fill(label, value);
    await submit();
    for (const label of ['ISBN *', 'Title *', 'Publisher *', 'Description *']) {
      expect(labelledField(host, label).getAttribute('aria-invalid')).toBe('true');
      const description = labelledField(host, label).getAttribute('aria-describedby');
      expect(description).toBeTruthy();
      expect(element(host, `[id="${description}"]`).textContent).toMatch(/Enter /);
    }
    expect(submitted).not.toHaveBeenCalled();
  });

  it('allows correction, normalizes blank pages to zero and prevents native navigation', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await fill('Title *', '');
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    await fill('Title *', 'Corrected title');
    await fill('Pages', '');
    const event = await submit();
    expect(event.defaultPrevented).toBe(true);
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ ...sampleDraft, title: 'Corrected title', numPages: 0 });
  });

  it('renders immutable ISBN separately in edit mode and does not require draft ISBN', async () => {
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('isbn', 'original-isbn');
    fixture.componentRef.setInput('initialValue', { ...sampleDraft, isbn: '' });
    fixture.detectChanges();
    expect(labelledField(host, 'ISBN (read-only)').readOnly).toBe(true);
    expect(labelledField(host, 'ISBN (read-only)').value).toBe('original-isbn');
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ ...sampleDraft, isbn: '' });
  });

  it('blocks submission while pending and disables its fieldset', async () => {
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    expect(element<HTMLFieldSetElement>(host, 'fieldset').disabled).toBe(true);
    expect(host.textContent).toContain('Saving book...');
    await submit();
    expect(submitted).not.toHaveBeenCalled();
  });

  it('preserves the draft across pending/error changes so a failed save can be retried', async () => {
    await fill('Title *', 'Unsaved title');
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('pending', false);
    fixture.componentRef.setInput('error', 'Please retry.');
    fixture.detectChanges();
    expect(labelledField(host, 'Title *').value).toBe('Unsaved title');
    expect(element(host, '[role="alert"]').textContent).toContain('Please retry.');
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ ...sampleDraft, title: 'Unsaved title' });
  });

  it('resets draft values and validation state when a different initial book arrives', async () => {
    await fill('Title *', '');
    await submit();
    expect(labelledField(host, 'Title *').getAttribute('aria-invalid')).toBe('true');
    fixture.componentRef.setInput('initialValue', { ...sampleDraft, title: 'Another book' });
    fixture.detectChanges();
    expect(labelledField(host, 'Title *').value).toBe('Another book');
    expect(labelledField(host, 'Title *').getAttribute('aria-invalid')).toBe('false');
    expect(host.textContent).not.toContain('Enter a title.');
  });

  it('emits cancellation without submitting values', () => {
    const cancelled = vi.fn();
    const submitted = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentInstance.submitted.subscribe(submitted);
    element<HTMLButtonElement>(host, 'button[type="button"]').click();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(submitted).not.toHaveBeenCalled();
  });

  it.each([0, 123])('normalizes native bad number input after initial pages %s', async numPages => {
    fixture.componentRef.setInput('initialValue', { ...sampleDraft, numPages });
    fixture.detectChanges();
    const pages = labelledField(host, 'Pages');
    // jsdom cannot type an incomplete native number. Emulate the browser clearing
    // badInput when the component clears the value and dispatches its input event.
    let badInput = true;
    Object.defineProperty(pages, 'validity', { get: () => ({ badInput, valid: !badInput }), configurable: true });
    pages.addEventListener(
      'input',
      () => {
        badInput = false;
      },
      { capture: true, once: true }
    );
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledExactlyOnceWith({ ...sampleDraft, numPages: 0 });
  });
});
