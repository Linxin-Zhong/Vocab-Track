import type { Book } from "../services/bookService";

type DictionariesPageProps = {
  selectedBookId: number | null;
  books: Book[]
};

export function DictionariesPage({ selectedBookId, books }: DictionariesPageProps) {
    return (
        <div>
            <p>{selectedBookId? selectedBookId : "No book selected"}</p>
            {books.map((book, index) => (
                <p key={index}>{book.book_name}</p>
            ))}
        </div>
    )
}