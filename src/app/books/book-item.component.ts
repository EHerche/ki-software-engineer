import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';
import { BookCoverComponent } from './book-cover.component';
import { BookCollectionParams } from './book-collection-query';

@Component({
  selector: 'app-book-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent],
  templateUrl: './book-item.component.html'
})
export class BookItemComponent {
  readonly book = input.required<Book>();
  readonly active = input(false);
  readonly collectionQuery = input<BookCollectionParams>({});
  readonly selected = output<Event>();

  select(event: Event): void {
    this.selected.emit(event);
  }
}
