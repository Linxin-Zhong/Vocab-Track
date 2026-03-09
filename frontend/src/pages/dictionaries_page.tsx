import type { Book } from "../services/bookService";

type DictionariesPageProps = {
    handleChangeBook: (bookId: number) => void;
    selectedBookId: number | null;
    books: Book[]
};

export function DictionariesPage({ handleChangeBook, selectedBookId, books }: DictionariesPageProps) {
    return (
        <div>
            <p>{selectedBookId? selectedBookId : "No book selected"}</p>
            {books.map((book, index) => (
                <p key={index} onClick={() => handleChangeBook(book.id)}>
                    {book.book_name}
                </p>
            ))}
        </div>
    )
}