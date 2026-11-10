import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-book-cover',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block h-full w-full' },
  template: `
    <img
      *ngIf="cover && !failed; else noCover"
      [src]="cover"
      [alt]="'Cover of ' + title"
      (error)="onImageError()"
      class="h-full w-full object-contain bg-recessed"
    />
    <ng-template #noCover>
      <div class="flex h-full items-center justify-center bg-recessed p-6 text-center text-muted">
        No cover available
      </div>
    </ng-template>
  `
})
export class BookCoverComponent implements OnChanges {
  @Input({ required: true }) cover = '';
  @Input({ required: true }) title = '';
  protected failed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cover']) {
      this.failed = false;
    }
  }

  protected onImageError(): void {
    this.failed = true;
  }
}
