import { useEffect, useMemo, useRef, useState } from "react";
import { getBooks, getWordsByBookId, type Word } from "../services/bookService";
import "./flashcard.css";

type ViewMode = "question" | "answer";

type FlashcardProps = {
  onQuit: (stats?: { correct: number; total: number }) => void;
};

export function Flashcard({ onQuit }: FlashcardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("question");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const correctCount = useRef(0);
  const viewedCount = useRef(0);

  const currentWord = words[currentIndex];
  const isSessionComplete = words.length > 0 && currentIndex >= words.length;

  useEffect(() => {
    if (isSessionComplete) {
      onQuit({ correct: correctCount.current, total: viewedCount.current });
    }
  }, [isSessionComplete, onQuit]);

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

        // Book selection policy:
        // - Prefer a non-default book if any exist.
        // - If multiple non-default books exist, we intentionally use the first one
        //   in the `books` array, relying on the API/backend to provide books in
        //   a deterministic, user-meaningful order (e.g., user preference or recency).
        // - If no non-default books exist, fall back to the first (default) book.
        const selectedBook = books.find((book) => !book.is_default) ?? books[0];
        const fetchedWords = await getWordsByBookId(selectedBook.id);

        if (isMounted) {
          setWords(fetchedWords);
          setCurrentIndex(0);
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
  }, [getBooks, getWordsByBookId]);

  const cardCountLabel = useMemo(() => {
    if (!words.length) return "Card 0 of 0";
    if (isSessionComplete) return `Card ${words.length} of ${words.length}`;
    return `Card ${currentIndex + 1} of ${words.length}`;
  }, [words.length, currentIndex, isSessionComplete]);

  const goToNextCard = () => {
    setCurrentIndex((prev) => prev + 1);
    setViewMode("question");
  };

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
            <button
              className="flashcard-quit"
              onClick={() => onQuit({ correct: correctCount.current, total: viewedCount.current })}
            >
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
            <button
              className="flashcard-quit"
              onClick={() => onQuit({ correct: correctCount.current, total: viewedCount.current })}
            >
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
                    onClick={() => {
                      viewedCount.current += 1;
                      goToNextCard();
                    }}
                  >
                    I didn&apos;t know this
                  </button>
                  <button
                    className="flashcard-primary-btn"
                    onClick={() => {
                      viewedCount.current += 1;
                      correctCount.current += 1;
                      goToNextCard();
                    }}
                  >
                    I knew this
                  </button>
                </div>
              )}
            </>
          </section>

          <button
            className="flashcard-quit"
            onClick={() => onQuit({ correct: correctCount.current, total: viewedCount.current })}
          >
            Quit session
          </button>
        </div>
      </div>
    </main>
  );
}
