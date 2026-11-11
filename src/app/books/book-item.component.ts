import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';

@Component({
  selector: 'app-book-item',
  standalone: true,
  imports: [RouterLink, BookCoverComponent],
  templateUrl: './book-item.component.html'
})
export class BookItemComponent {
  @Input() book!: Book;
  @Input() active = false;
  @Output() selected = new EventEmitter<Event>();

  select(event: Event): void {
    this.selected.emit(event);
  }
}
