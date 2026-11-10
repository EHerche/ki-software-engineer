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
    <div
      class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
    >
      <div class="relative aspect-[3/4] overflow-hidden">
        <app-book-cover [cover]="book.cover" [title]="book.title"></app-book-cover>
      </div>
      <div class="p-5 flex flex-col flex-grow">
        <h2 class="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
          <a
            [routerLink]="['/books', book.id]"
            class="rounded-sm hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {{ book.title }}
          </a>
        </h2>
        <p *ngIf="book.subtitle" class="text-sm text-gray-600 mb-2 line-clamp-2">{{ book.subtitle }}</p>
        <div class="text-sm text-gray-700 mt-auto">
          <p>
            <span class="text-blue-700">{{ book.author }}</span>
          </p>
          <p *ngIf="book.isbn" class="text-xs text-gray-500 mt-2">ISBN: {{ book.isbn }}</p>
        </div>
      </div>
    </div>
  `
})
export class BookItemComponent {
  @Input() book!: Book;
}
