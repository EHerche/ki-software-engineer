import { ChangeDetectionStrategy, computed, Component, ElementRef, viewChild, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';
import { BookCollectionParams } from './book-collection-query';

@Component({
  selector: 'app-book-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent],
  templateUrl: './book-preview.component.html'
})
export class BookPreviewComponent {
  readonly book = input.required<Book>();
  readonly roulette = input(false);
  readonly collectionQuery = input<BookCollectionParams>({});
  readonly closed = output<void>();
  readonly reroll = output<void>();
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  focusCloseButton(): void {
    this.closeButton()?.nativeElement.focus();
  }

  close(): void {
    this.closed.emit();
  }

  challengeFate(): void {
    this.reroll.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, a[href]'));
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

  readonly shortDescription = computed(() => this.book().abstract.slice(0, 300));
}
