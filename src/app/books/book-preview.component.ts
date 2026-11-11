import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';

@Component({
  selector: 'app-book-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCoverComponent],
  templateUrl: './book-preview.component.html'
})
export class BookPreviewComponent {
  @Input({ required: true }) book!: Book;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  focusCloseButton(): void {
    this.closeButton?.nativeElement.focus();
  }

  close(): void {
    this.closed.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, a[href]')
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  get shortDescription(): string {
    return this.book.abstract.slice(0, 300);
  }
}
