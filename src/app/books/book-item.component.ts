import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';

@Component({
  selector: 'app-book-item',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCoverComponent],
  template: `
    <div class="book-card bg-surface rounded-xl overflow-hidden flex flex-col h-full">
      <div class="relative aspect-[3/4] overflow-hidden">
        <app-book-cover [cover]="book.cover" [title]="book.title"></app-book-cover>
      </div>
      <div class="p-5 flex flex-col flex-grow">
        <h2 class="text-lg font-semibold text-ink mb-1 line-clamp-2">
          <a
            [routerLink]="['/books', book.id]"
            class="rounded-sm hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {{ book.title }}
          </a>
        </h2>
        <p *ngIf="book.subtitle" class="text-sm text-muted mb-2 line-clamp-2">{{ book.subtitle }}</p>
        <div class="text-sm text-ink mt-auto">
          <p>
            <span class="text-accent">{{ book.author }}</span>
          </p>
          <p *ngIf="book.isbn" class="text-xs text-muted mt-2">ISBN: {{ book.isbn }}</p>
        </div>
      </div>
    </div>
  `
})
export class BookItemComponent {
  @Input() book!: Book;
}
