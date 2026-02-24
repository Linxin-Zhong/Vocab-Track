import { useEffect, useMemo, useState } from "react";
import { getBooks, getWordsByBookId, type Word } from "../services/bookService";
import "./flashcard.css";

type ViewMode = "question" | "answer";

type FlashcardStudyProps = {
  onQuit: () => void;
};

export function FlashcardStudy({ onQuit }: FlashcardStudyProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("question");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  const currentIndex = 0;
  const currentWord = words[currentIndex];

  useEffect(() => {
    let isMounted = true;

    const loadWords = async () => {
      setLoading(true);
      setError(null);

      try {
        const books = await getBooks();

        if (!books.length) {
          if (isMounted) setWords([]);
          return;
        }

        // keep your original selection logic
        const selectedBook = books.find((book) => !book.is_default) ?? books[0];
        const fetchedWords = await getWordsByBookId(selectedBook.id);

        if (isMounted) {
          setWords(fetchedWords);
          setViewMode("question");
        }
      } catch {
        if (isMounted) setError("Failed to load flashcards");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadWords();
    return () => {
      isMounted = false;
    };
  }, []);

  const cardCountLabel = useMemo(() => {
    if (!words.length) return "Card 0 of 0";
    return `Card 1 of ${words.length}`;
  }, [words.length]);

  if (loading) {
    return (
      <main className="flashcard-page">
        <div className="flashcard-frame">
          <div className="flashcard-container">
            <p className="flashcard-status">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flashcard-page">
        <div className="flashcard-frame">
          <div className="flashcard-container">
            <p className="flashcard-error">{error}</p>
            <button className="flashcard-quit" onClick={onQuit}>
              Quit session
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentWord) {
    return (
      <main className="flashcard-page">
        <div className="flashcard-frame">
          <div className="flashcard-container">
            <p className="flashcard-status">No words to review</p>
            <button className="flashcard-quit" onClick={onQuit}>
              Quit session
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flashcard-page">
      <div className="flashcard-frame">
        <div className="flashcard-container">
          <p className="flashcard-progress">{cardCountLabel}</p>

          <section className="flashcard-card">
            {!currentWord ? null : (
              <>
                <div className="flashcard-content">
                  <h1 className="flashcard-word">{currentWord.word_text}</h1>

                  {viewMode === "answer" && (
                    <div className="flashcard-answer-text">
                      <p className="flashcard-meaning">{currentWord.meaning}</p>
                      {currentWord.example ? (
                        <p className="flashcard-example">
                          "{currentWord.example}"
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                {viewMode === "question" ? (
                  <button
                    className="flashcard-primary-btn"
                    onClick={() => setViewMode("answer")}
                  >
                    Show Answer
                  </button>
                ) : (
                  <div className="flashcard-answer-actions">
                    <button
                      className="flashcard-secondary-btn"
                      onClick={() => console.log("didnt_know", currentWord.id)}
                    >
                      I didn&apos;t know this
                    </button>
                    <button
                      className="flashcard-primary-btn"
                      onClick={() => console.log("knew", currentWord.id)}
                    >
                      I knew this
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <button className="flashcard-quit" onClick={onQuit}>
            Quit session
          </button>
        </div>
      </div>
    </main>
  );
}
