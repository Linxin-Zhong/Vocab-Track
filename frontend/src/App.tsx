import { useState } from "react";
import "./App.css";
import { StartingPage } from "./pages/starting_page";
import { LoginPage } from "./pages/login_page";
import { login, register, logout } from "./services/authService";
import { Dashboard } from "./pages/dashboard";
import { AuthError } from "./types/auth";
import { Flashcard } from "./pages/flashcard";
import { SessionSummary } from "./pages/session_summary";
import { getBooks } from "./services/bookService";
import {
  startReviewSession,
  type ReviewSessionWord,
} from "./services/reviewService";

type Screen = "landing" | "signup" | "dashboard" | "flashcard" | "summary";
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
  return `${REVIEWED_TODAY_STORAGE_PREFIX}:${userEmail.toLowerCase()}:${getLocalDateStamp()}`;
}

function getActiveSessionStorageKey(userEmail: string): string {
  return `${ACTIVE_SESSION_STORAGE_PREFIX}:${userEmail.toLowerCase()}`;
}

function isValidActiveSession(data: unknown): data is ActiveSession {
  if (!data || typeof data !== "object") return false;
  const session = data as Partial<ActiveSession>;
  if (typeof session.session_id !== "number") return false;
  if (typeof session.book_id !== "number") return false;
  if (!Array.isArray(session.words)) return false;

  return session.words.every(
    (word) =>
      word &&
      typeof word === "object" &&
      typeof word.user_word_id === "number" &&
      typeof word.word_text === "string" &&
      typeof word.meaning === "string",
  );
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

  const readActiveSessionFromStorage = (
    userEmail: string,
  ): ActiveSession | null => {
    const storageKey = getActiveSessionStorageKey(userEmail);
    const savedSession = localStorage.getItem(storageKey);
    if (!savedSession) return null;
    try {
      const parsed = JSON.parse(savedSession);
      if (!isValidActiveSession(parsed)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  };

  const clearActiveSession = (userEmail: string | null = currentUserEmail) => {
    setActiveSession(null);
    setCurrentBookId(null);
    persistActiveSession(userEmail, null);
  };

  const readTodayReviewedFromStorage = (userEmail: string): number => {
    const stored = localStorage.getItem(getReviewedTodayStorageKey(userEmail));
    const parsed = Number(stored ?? "0");
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const writeTodayReviewedToStorage = (userEmail: string, count: number) => {
    localStorage.setItem(getReviewedTodayStorageKey(userEmail), String(count));
  };

  const syncTodayReviewedForUser = (userEmail: string) => {
    setTotalReviewed(readTodayReviewedFromStorage(userEmail));
  };

  const handleFlashcardQuit = (stats?: SessionStats) => {
    clearActiveSession();

    if (stats && stats.total > 0) {
      console.log("stat total:", stats.total);
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
      // Resume unfinished review session after login so users can continue seamlessly.
      const restoredSession = readActiveSessionFromStorage(userEmail);
      setCurrentUserEmail(userEmail);
      syncTodayReviewedForUser(userEmail);
      applyActiveSession(restoredSession);
      navigateTo(restoredSession ? "flashcard" : "dashboard");
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
  };

  const handleRegister = async (email: string, password: string) => {
    const res = await register(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      const userEmail = res.user.email;
      // New users follow the same restore flow in case of a refresh during onboarding.
      const restoredSession = readActiveSessionFromStorage(userEmail);
      setCurrentUserEmail(userEmail);
      syncTodayReviewedForUser(userEmail);
      applyActiveSession(restoredSession);
      navigateTo(restoredSession ? "flashcard" : "dashboard");
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
        // Fallback mode: allow users to keep reviewing even if no due words.
        // We intentionally clear activeSession so flashcard page uses local/non-session flow.
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

  return (
    <div>
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
          onLogout={handleLogout}
          isStartingSession={startSessionLoading}
          startSessionError={startSessionError}
        />
      )}
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
