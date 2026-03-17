import { useEffect, useState } from "react";
import type { Book } from "../services/bookService";
import "./dictionaries_page.css";

type DictionariesPageProps = {
  handleChangeBook: (bookId: number) => void;
  handleChangeBookLanguage: (bookId: number, language: string | null) => void;
  selectedBookId: number | null;
  books: Book[];
};

export function DictionariesPage({
  handleChangeBook,
  handleChangeBookLanguage,
  selectedBookId,
  books,
}: DictionariesPageProps) {
  const [languages, setLanguages] = useState<string[]>([]);
  useEffect(() => {
    // Get voices, but make sure to wait for them to load
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const langs = Array.from(new Set(voices.map((v) => v.lang)));
      setLanguages(langs);
    };

    // Some browsers may need this event
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

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
                <select
                  value={dict.language ?? "null"}
                  onChange={(e) =>
                    handleChangeBookLanguage(dict.id, e.target.value || null)
                  }
                  className="pronounciation-selection"
                >
                  <option value="null">Language not defined</option>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
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
