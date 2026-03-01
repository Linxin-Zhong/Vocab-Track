import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBooks, getWordsByBookId, type Word } from "../services/bookService";
import {
  answerReviewWord,
  endReviewSession,
  type ReviewSessionWord,
} from "../services/reviewService";
import "./flashcard.css";

type ViewMode = "question" | "answer";

type FlashcardProps = {
  onQuit: (stats?: {
    correct: number;
    total: number;
    duration_seconds: number;
    accuracy: number;
  }) => void;
  // When provided, flashcard runs in backend session mode (answer/end APIs enabled).
  sessionId?: number | null;
  sessionWords?: ReviewSessionWord[] | null;
  bookId?: number | null;
};

type StudyWord = Pick<Word, "word_text" | "meaning" | "example"> & {
  user_word_id?: number;
};

const LOCAL_PRACTICE_LIMIT = 5;

function pickLocalPracticeWords(words: Word[]): StudyWord[] {
  // Practice mode helper: backend session is absent, so keep each local drill short.
  if (words.length <= LOCAL_PRACTICE_LIMIT) return words;

  // Use reservoir sampling to pick LOCAL_PRACTICE_LIMIT random words without
  // shuffling or copying the entire array.
  const reservoir: StudyWord[] = words.slice(0, LOCAL_PRACTICE_LIMIT);

  for (let i = LOCAL_PRACTICE_LIMIT; i < words.length; i += 1) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < LOCAL_PRACTICE_LIMIT) {
      reservoir[j] = words[i];
    }
  }

  return reservoir;
}

export function Flashcard({
  onQuit,
  sessionId,
  sessionWords,
  bookId,
}: FlashcardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("question");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [words, setWords] = useState<StudyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const correctCount = useRef(0);
  const viewedCount = useRef(0);
  const hasEndedSession = useRef(false);

  const currentWord = words[currentIndex];
  const isSessionComplete = words.length > 0 && currentIndex >= words.length;

  const goToNextCard = () => {
    setCurrentIndex((prev) => prev + 1);
    setViewMode("question");
  };

  const buildLocalSessionStats = useCallback(() => {
    const total = viewedCount.current;
    const correct = correctCount.current;
    return {
      correct,
      total,
      duration_seconds: 0,
      accuracy: total > 0 ? correct / total : 0,
    };
  }, []);

  const finalizeSession = useCallback(async () => {
    // Avoid ending a backend session while an answer is still being persisted.
    if (answerLoading) return;

    if (sessionId == null) {
      // Practice mode (no backend session created):
      // - skip `/review/end/`
      // - use local counts only for summary
      onQuit(buildLocalSessionStats());
      return;
    }

    // Prevent duplicate `/review/end/` calls from rapid clicks/effect re-runs.
    if (hasEndedSession.current) return;
    hasEndedSession.current = true;
    setEndLoading(true);
    setError(null);
    try {
      const result = await endReviewSession(sessionId);
      onQuit({
        correct: result.correct,
        total: result.total,
        duration_seconds: result.duration_seconds,
        accuracy: result.accuracy,
      });
    } catch (error) {
      const status =
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : null;

      // Never trap users in this screen when session end fails.
      if (status === 404 || status === 401) {
        onQuit(buildLocalSessionStats());
        return;
      }

      hasEndedSession.current = false;
      onQuit(buildLocalSessionStats());
    } finally {
      setEndLoading(false);
    }
  }, [answerLoading, sessionId, onQuit, buildLocalSessionStats]);

  useEffect(() => {
    // Auto-end once the user has answered all words in the current session.
    if (isSessionComplete) {
      void finalizeSession();
    }
  }, [isSessionComplete, finalizeSession]);

  const enrichSessionWordsWithExamples = useCallback(
    async (rawSessionWords: ReviewSessionWord[]): Promise<StudyWord[]> => {
      try {
        let targetBookId = bookId;
        if (!targetBookId) {
          // Keep book selection consistent with start-session policy.
          const books = await getBooks();
          if (!books.length) return rawSessionWords;
          targetBookId = (books.find((book) => !book.is_default) ?? books[0]).id;
        }

        const fullWords = await getWordsByBookId(targetBookId);
        const exampleByWordText = new Map(
          fullWords.map((word) => [word.word_text.trim().toLowerCase(), word.example]),
        );

        return rawSessionWords.map((word) => ({
          ...word,
          example: exampleByWordText.get(word.word_text.trim().toLowerCase()) ?? null,
        }));
      } catch {
        // Fall back to session words if enrichment fails.
        return rawSessionWords;
      }
    },
    [bookId, getBooks, getWordsByBookId],
  );

  useEffect(() => {
    let isMounted = true;

    const loadWords = async () => {
      setLoading(true);
      setError(null);

      try {
        if (sessionId != null && sessionWords != null) {
          // Preferred path: words returned by `/review/start/` for this session.
          if (isMounted) {
            const enrichedWords = await enrichSessionWordsWithExamples(sessionWords);
            if (!isMounted) return;
            setWords(enrichedWords);
            setCurrentIndex(0);
            setViewMode("question");
          }
          return;
        }

        let targetBookId = bookId;
        if (!targetBookId) {
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
          targetBookId = (books.find((book) => !book.is_default) ?? books[0]).id;
        }

        const fetchedWords = await getWordsByBookId(targetBookId);

        if (isMounted) {
          // Practice mode path: this branch runs only when `sessionId/sessionWords`
          // are absent, so no `/review/answer/` or `/review/end/` lifecycle exists.
          setWords(pickLocalPracticeWords(fetchedWords));
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
  }, [sessionId, sessionWords, bookId, enrichSessionWordsWithExamples]);

  const cardCountLabel = useMemo(() => {
    if (!words.length) return "Card 0 of 0";
    if (isSessionComplete) return `Card ${words.length} of ${words.length}`;
    return `Card ${currentIndex + 1} of ${words.length}`;
  }, [words.length, currentIndex, isSessionComplete]);

  const handleSubmitAnswer = async (isCorrect: boolean) => {
    if (answerLoading || endLoading) return;

    if (
      sessionId != null &&
      currentWord &&
      currentWord.user_word_id != null
    ) {
      // Backend session mode only: persist answers to keep scheduling/statistics server-authoritative.
      setAnswerLoading(true);
      try {
        await answerReviewWord(sessionId, currentWord.user_word_id, isCorrect);
      } catch {
        // Treat answer save failures as non-fatal so the user can continue the session.
      } finally {
        setAnswerLoading(false);
      }
    }

    viewedCount.current += 1;
    if (isCorrect) {
      correctCount.current += 1;
    }
    goToNextCard();
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
              onClick={() => void finalizeSession()}
              disabled={answerLoading || endLoading}
            >
              {endLoading ? "Ending..." : "Quit session"}
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
              onClick={() => void finalizeSession()}
              disabled={answerLoading || endLoading}
            >
              {endLoading ? "Ending..." : "Quit session"}
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
                  disabled={answerLoading || endLoading}
                  onClick={() => setViewMode("answer")}
                >
                  Show Answer
                </button>
              ) : (
                <div className="flashcard-answer-actions">
                  <button
                    className="flashcard-secondary-btn"
                    disabled={answerLoading || endLoading}
                    onClick={() => void handleSubmitAnswer(false)}
                  >
                    I didn&apos;t know this
                  </button>
                  <button
                    className="flashcard-primary-btn"
                    disabled={answerLoading || endLoading}
                    onClick={() => void handleSubmitAnswer(true)}
                  >
                    I knew this
                  </button>
                </div>
              )}
            </>
          </section>

          <button
            className="flashcard-quit"
            onClick={() => void finalizeSession()}
            disabled={answerLoading || endLoading}
          >
            {endLoading ? "Ending..." : "Quit session"}
          </button>
        </div>
      </div>
    </main>
  );
}
