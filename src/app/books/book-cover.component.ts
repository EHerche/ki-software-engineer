import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-book-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full w-full' },
  template: `
    @if (cover() && !failed()) {
      <img
        [src]="cover()"
        [alt]="'Cover of ' + title()"
        (error)="onImageError()"
        class="h-full w-full object-contain bg-recessed"
      />
    } @else {
      <div class="flex h-full items-center justify-center bg-recessed p-6 text-center text-muted">
        No cover available
      </div>
    }
  `
})
export class BookCoverComponent {
  readonly cover = input.required<string>();
  readonly title = input.required<string>();
  protected readonly failed = linkedSignal({ source: this.cover, computation: () => false });

  protected onImageError(): void {
    this.failed.set(true);
  }
}
