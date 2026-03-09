import type { Book } from "../services/bookService";
import "./dictionaries_page.css";

type DictionariesPageProps = {
  handleChangeBook: (bookId: number) => void;
  selectedBookId: number | null;
  books: Book[];
};

export function DictionariesPage({
  handleChangeBook,
  selectedBookId,
  books,
}: DictionariesPageProps) {
  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dictionaries</h1>
        <p className="page-subtitle">
          Choose a vocabulary source for your study sessions
        </p>
      </div>

      {/* Dictionary grid */}
      <div className="dictionary-grid">
        {books.map((dict) => {
          const isSelected = selectedBookId === dict.id;
          return (
            <div
              key={dict.id}
              onClick={() => handleChangeBook(dict.id)}
              className={`dictionary-card ${isSelected ? "selected" : ""}`}
            >
              <div className="card-header">
                <div className="card-info">
                  <h2 className="card-name">{dict.book_name}</h2>
                </div>
                {isSelected && (
                  <div className="card-check">
                    <div className="card-check">✓</div>
                  </div>
                )}
              </div>

              <div className="card-footer">
                {/* <span className="word-count">
                  {dict.wordCount.toLocaleString()} words
                </span> */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangeBook(dict.id);
                  }}
                  className={`select-button ${isSelected ? "selected-btn" : ""}`}
                >
                  {isSelected ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected confirmation */}
      {selectedBookId && (
        <div className="selected-confirmation">
          <p className="active-dictionary">
            Active dictionary:{" "}
            <span className="dictionary-name">
              {books.find((b) => b.id === selectedBookId)?.book_name}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
