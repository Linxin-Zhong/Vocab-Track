import { useState } from "react";
import "./App.css";
import { StartingPage } from "./pages/starting_page";
import { LoginPage } from "./pages/login_page";
import { login, register, logout } from "./services/authService";
import { Dashboard } from "./pages/dashboard";
import { AuthError } from "./types/auth";
import { Flashcard } from "./pages/flashcard";
import { SessionSummary } from "./pages/session_summary";
import { ProgressPage } from "./pages/progress_page";
import { DictionariesPage } from "./pages/dictionaries_page";
import { getBooks, type Book } from "./services/bookService";
import {
  startReviewSession,
  type ReviewSessionWord,
} from "./services/reviewService";

type Screen =
  | "landing"
  | "signup"
  | "dashboard"
  | "progress"
  | "dictionaries"
  | "flashcard"
  | "summary";
type ActiveSession = {
  session_id: number;
  book_id: number;
  words: ReviewSessionWord[];
};
type SessionStats = {
  correct: number;
  total: number;
  duration_seconds: number;
  accuracy: number;
};

const ACTIVE_SESSION_STORAGE_PREFIX = "active_review_session";
const REVIEWED_TODAY_STORAGE_PREFIX = "reviewed_today";
const DEFAULT_REVIEW_LIMIT = 5;

function getLocalDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getReviewedTodayStorageKey(userEmail: string): string {
  // Keep this key date-scoped so "reviewed today" resets automatically each day.
  const emailKeyPart = userEmail.toLowerCase();
  const todayStamp = getLocalDateStamp();
  const todayKey = `${REVIEWED_TODAY_STORAGE_PREFIX}:${emailKeyPart}:${todayStamp}`;

  // Clean up older reviewed_today:* keys for this user to avoid unbounded growth.
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const prefixForUser = `${REVIEWED_TODAY_STORAGE_PREFIX}:${emailKeyPart}:`;
      const keysToRemove: string[] = [];

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(prefixForUser) && key !== todayKey) {
          keysToRemove.push(key);
        }
      }

      for (const oldKey of keysToRemove) {
        window.localStorage.removeItem(oldKey);
      }
    }
  } catch {
    // If localStorage is not accessible (e.g., in some environments),
    // fail silently and just return today's key.
  }

  return todayKey;
}

function getActiveSessionStorageKey(userEmail: string): string {
  return `${ACTIVE_SESSION_STORAGE_PREFIX}:${userEmail.toLowerCase()}`;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correct: 0,
    total: 0,
    duration_seconds: 0,
    accuracy: 0,
  });
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [startSessionLoading, setStartSessionLoading] = useState(false);
  const [startSessionError, setStartSessionError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentBookId, setCurrentBookId] = useState<number | null>(null);
  const [bookList, setBookList] = useState<Book[]>([]);

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const applyActiveSession = (session: ActiveSession | null) => {
    if (!session) {
      setActiveSession(null);
      setCurrentBookId(null);
      return;
    }
    setActiveSession(session);
    setCurrentBookId(session.book_id);
  };

  const persistActiveSession = (
    userEmail: string | null,
    session: ActiveSession | null,
  ) => {
    if (!userEmail) return;
    const storageKey = getActiveSessionStorageKey(userEmail);
    if (!session) {
      localStorage.removeItem(storageKey);
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(session));
  };

  const clearActiveSession = (userEmail: string | null = currentUserEmail) => {
    setActiveSession(null);
    setCurrentBookId(null);
    persistActiveSession(userEmail, null);
  };

  const readTodayReviewedFromStorage = (userEmail: string): number => {
    try {
      const stored = localStorage.getItem(getReviewedTodayStorageKey(userEmail));
      const parsed = Number(stored ?? "0");
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      // If localStorage is unavailable or access fails, treat as zero reviewed.
      return 0;
    }
  };

  const writeTodayReviewedToStorage = (userEmail: string, count: number) => {
    try {
      localStorage.setItem(getReviewedTodayStorageKey(userEmail), String(count));
    } catch {
      // Swallow storage errors to avoid breaking login/session flows.
    }
  };

  const syncTodayReviewedForUser = (userEmail: string) => {
    setTotalReviewed(readTodayReviewedFromStorage(userEmail));
  };

  const handleFlashcardQuit = (stats?: SessionStats) => {
    clearActiveSession();

    if (stats && stats.total > 0) {
      setSessionStats(stats);
      setTotalReviewed((prev) => {
        const next = prev + stats.total;
        if (currentUserEmail) {
          writeTodayReviewedToStorage(currentUserEmail, next);
        }
        return next;
      });
      navigateTo("summary");
    } else {
      navigateTo("dashboard");
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await login(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      const userEmail = res.user.email;
      // NOTE: Backend-driven auto-resume of unfinished review sessions on login
      // is disabled until we can safely restore full progress (current index,
      // answered words, counts) from the backend to avoid resubmitting
      // already-answered cards. We still persist active sessions in localStorage
      // and may restore them in limited flows (e.g. registration) as a temporary
      // UX aid until full resume support is implemented.
      setCurrentUserEmail(userEmail);
      syncTodayReviewedForUser(userEmail);
      navigateTo("dashboard");
      console.log("login succeeded.");
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case "AUTH":
          console.error("login failed: auth");
          throw new AuthError("AUTH", "Invalid credentials");
        case "NETWORK":
          console.error("login failed: network");
          throw new AuthError("NETWORK", "Network error");
        case "RATE_LIMIT":
          console.error("login failed: rate limit");
          throw new AuthError("RATE_LIMIT", "Too many attempts");
        default:
          console.error("login failed: unknown");
          throw new AuthError("UNKNOWN", "Unknown error");
      }
    }
    const books = await getBooks();
    if (!books.length) {
        throw new Error("No books available");
      }

      setBookList(books);
  };

  const handleRegister = async (email: string, password: string) => {
    const res = await register(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      const userEmail = res.user.email;
      // Align behavior with login: do not auto-resume unfinished review sessions
      // until we can safely restore full progress from the backend.
      setCurrentUserEmail(userEmail);
      syncTodayReviewedForUser(userEmail);
      navigateTo("dashboard");
      console.info("register succeeded.");
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case "NETWORK":
          console.error("register failed: network.");
          throw new AuthError("NETWORK", "Network error");
        case "VALIDATION":
          console.error("register failed: validation.");
          throw new AuthError("VALIDATION", "Validation error");
        case "CONFLICT":
          console.error("register failed: conflict.");
          throw new AuthError("CONFLICT", "User already exists");
        case "RATE_LIMIT":
          console.error("register failed: rate.");
          throw new AuthError("RATE_LIMIT", "Too many attempts");
        default:
          console.error("register failed: unknown.");
          throw new AuthError("UNKNOWN", "Unknown error");
      }
    }
  };

  const handleLogout = async () => {
    const res = await logout();
    clearActiveSession(currentUserEmail);
    setCurrentUserEmail(null);
    setTotalReviewed(0);

    if (res.success) {
      console.info("logout succeeded.");
    } else {
      console.error("logout failed,", res.errorType);
    }
    // TODO: reset user.
    navigateTo("landing");
  };

  const handleStartSession = async () => {
    setStartSessionError(null);
    setStartSessionLoading(true);
    let selectedBookId: number | null = null;

    try {
      const books = await getBooks();
      if (!books.length) {
        throw new Error("No books available");
      }
      const selectedBook = books.find((book) => !book.is_default) ?? books[0];
      selectedBookId = selectedBook.id;
      const startedSession = await startReviewSession(
        selectedBook.id,
        DEFAULT_REVIEW_LIMIT,
      );

      const nextSession: ActiveSession = {
        session_id: startedSession.session_id,
        book_id: selectedBook.id,
        words: startedSession.words,
      };

      // idle -> in_session transition happens only after a successful API start.
      applyActiveSession(nextSession);
      persistActiveSession(currentUserEmail, nextSession);
      navigateTo("flashcard");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (/no words to review|book has no words/i.test(detail)) {
        // Practice mode fallback:
        // - Triggered when all words due today are already reviewed (or book has no due words).
        // - No backend review session is created in this flow.
        // - Flashcard page runs in local/non-session mode for continuous practice only.
        clearActiveSession(currentUserEmail);
        setCurrentBookId(selectedBookId);
        navigateTo("flashcard");
      } else {
        setStartSessionError("Failed to start study session. Please try again.");
      }
    } finally {
      setStartSessionLoading(false);
    }
  };

  const showTopNav =
    currentScreen === "dashboard" || currentScreen === "progress" || currentScreen === "dictionaries";

  return (
    <div className="app-shell">
      {showTopNav && (
        <header className="top-nav" role="banner">
          <div className="top-nav-inner">
            <p className="top-nav-brand">Vocab Track</p>
            <nav className="top-nav-links" aria-label="Primary">
              <button
                type="button"
                className={`top-nav-link ${
                  currentScreen === "dashboard" ? "is-active" : ""
                }`}
                onClick={() => navigateTo("dashboard")}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={`top-nav-link ${
                  currentScreen === "progress" ? "is-active" : ""
                }`}
                onClick={() => navigateTo("progress")}
              >
                Progress
              </button>
              <button
                type="button"
                className={`top-nav-link ${
                  currentScreen === "dictionaries" ? "is-active" : ""
                }`}
                onClick={() => navigateTo("dictionaries")}
              >
                Dictionaries
              </button>
            </nav>
            <button type="button" className="top-nav-link" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
      )}

      {currentScreen === "landing" && (
        <StartingPage onGetStarted={() => navigateTo("signup")} />
      )}
      {currentScreen === "signup" && (
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      )}
      {currentScreen === "dashboard" && (
        <Dashboard
          wordsReviewedToday={totalReviewed}
          onStartSession={handleStartSession}
          onViewProgress={() => navigateTo("progress")}
          isStartingSession={startSessionLoading}
          startSessionError={startSessionError}
        />
      )}
      {currentScreen === "progress" && <ProgressPage />}
      {currentScreen === "dictionaries" && <DictionariesPage selectedBookId={activeSession?.book_id ?? currentBookId} books={bookList} />}
      {currentScreen === "flashcard" && (
        <Flashcard
          onQuit={handleFlashcardQuit}
          sessionId={activeSession?.session_id ?? null}
          sessionWords={activeSession?.words ?? null}
          bookId={activeSession?.book_id ?? currentBookId}
        />
      )}
      {currentScreen === "summary" && (
        <SessionSummary
          stats={sessionStats}
          onReturnToDashboard={() => navigateTo("dashboard")}
        />
      )}
    </div>
  );
}
