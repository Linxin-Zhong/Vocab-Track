import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const loginMock = vi.fn();
const registerMock = vi.fn();
const logoutMock = vi.fn();
const getBooksMock = vi.fn();
const createBookMock = vi.fn();
const startReviewSessionMock = vi.fn();
const changeSelectedBookMock = vi.fn();
const changeBookLanguageMock = vi.fn();

vi.mock("./services/authService", () => ({
  login: (...args: unknown[]) => loginMock(...args),
  register: (...args: unknown[]) => registerMock(...args),
  logout: (...args: unknown[]) => logoutMock(...args),
}));

vi.mock("./services/bookService", () => ({
  getBooks: (...args: unknown[]) => getBooksMock(...args),
  createBook: (...args: unknown[]) => createBookMock(...args),
}));

vi.mock("./services/reviewService", () => ({
  startReviewSession: (...args: unknown[]) => startReviewSessionMock(...args),
}));

vi.mock("./services/selectedBookService", () => ({
  changeSelectedBook: (...args: unknown[]) => changeSelectedBookMock(...args),
}));

vi.mock("./services/bookLanguageService", () => ({
  changeBookLanguage: (...args: unknown[]) => changeBookLanguageMock(...args),
}));

vi.mock("./pages/starting_page", () => ({
  StartingPage: ({
    onGetStarted,
  }: {
    onGetStarted: () => void;
  }) => <button onClick={onGetStarted}>Open auth</button>,
}));

vi.mock("./pages/login_page", () => ({
  LoginPage: ({
    onLogin,
    onRegister,
  }: {
    onLogin?: (email: string, password: string) => void;
    onRegister?: (email: string, password: string) => void;
  }) => (
    <div>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("user@example.com", "secret")).catch(() => {});
        }}
      >
        Submit login
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("validation@example.com", "secret")).catch(() => {});
        }}
      >
        Login validation
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("auth@example.com", "secret")).catch(() => {});
        }}
      >
        Login auth
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("network@example.com", "secret")).catch(() => {});
        }}
      >
        Login network
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("rate@example.com", "secret")).catch(() => {});
        }}
      >
        Login rate
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onLogin?.("unknown@example.com", "secret")).catch(() => {});
        }}
      >
        Login unknown
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onRegister?.("user@example.com", "secret")).catch(() => {});
        }}
      >
        Submit register
      </button>
      <button
        onClick={() => {
          void Promise.resolve(
            onRegister?.("validation-register@example.com", "secret"),
          ).catch(() => {});
        }}
      >
        Register validation
      </button>
      <button
        onClick={() => {
          void Promise.resolve(
            onRegister?.("network-register@example.com", "secret"),
          ).catch(() => {});
        }}
      >
        Register network
      </button>
      <button
        onClick={() => {
          void Promise.resolve(
            onRegister?.("conflict-register@example.com", "secret"),
          ).catch(() => {});
        }}
      >
        Register conflict
      </button>
      <button
        onClick={() => {
          void Promise.resolve(
            onRegister?.("rate-register@example.com", "secret"),
          ).catch(() => {});
        }}
      >
        Register rate
      </button>
      <button
        onClick={() => {
          void Promise.resolve(
            onRegister?.("unknown-register@example.com", "secret"),
          ).catch(() => {});
        }}
      >
        Register unknown
      </button>
    </div>
  ),
}));

vi.mock("./pages/dashboard", () => ({
  Dashboard: ({
    wordsReviewedToday,
    onStartSession,
    onViewProgress,
    onViewDictionaries,
    onImportWords,
    startSessionError,
    isStartingSession,
  }: {
    wordsReviewedToday: number;
    onStartSession: () => void;
    onViewProgress: () => void;
    onViewDictionaries: () => void;
    onImportWords: () => void;
    startSessionError?: string | null;
    isStartingSession?: boolean;
  }) => (
    <div>
      <div>dashboard reviewed:{wordsReviewedToday}</div>
      {isStartingSession ? <div>starting session...</div> : null}
      {startSessionError ? <div>{startSessionError}</div> : null}
      <button onClick={onStartSession}>Start Study Session</button>
      <button onClick={onViewProgress}>Go progress</button>
      <button onClick={onViewDictionaries}>Go dictionaries</button>
      <button onClick={onImportWords}>Go import</button>
    </div>
  ),
}));

vi.mock("./pages/progress_page", () => ({
  ProgressPage: ({
    studyingDictionary,
  }: {
    studyingDictionary: number | null;
  }) => <div>progress:{studyingDictionary ?? "none"}</div>,
}));

vi.mock("./pages/dictionaries_page", () => ({
  DictionariesPage: ({
    handleChangeBook,
    handleChangeBookLanguage,
    selectedBookId,
    books,
  }: {
    handleChangeBook: (bookId: number) => void;
    handleChangeBookLanguage: (bookId: number, language: string | null) => void;
    selectedBookId: number | null;
    books: Array<{ id: number; book_name: string }>;
  }) => (
    <div>
      dictionaries:{selectedBookId ?? "none"}:{books.map((book) => book.book_name).join(",")}
      <button onClick={() => handleChangeBook(2)}>Choose book 2</button>
      <button onClick={() => handleChangeBook(selectedBookId ?? 0)}>
        Choose active book
      </button>
      <button onClick={() => handleChangeBook(3)}>Choose book 3</button>
      <button onClick={() => handleChangeBookLanguage(1, "fr-FR")}>
        Set language fr-FR
      </button>
    </div>
  ),
}));

vi.mock("./pages/import_words_page", () => ({
  ImportWordsPage: ({
    books,
    selectedBookId,
    onChangeBook,
    onCreateBook,
    onGoToDictionaries,
    onStartStudySession,
  }: {
    books: Array<{ id: number; book_name: string }>;
    selectedBookId: number | null;
    onChangeBook: (bookId: number) => void;
    onCreateBook: (bookName: string) => Promise<unknown>;
    onGoToDictionaries: () => void;
    onStartStudySession: () => void;
  }) => (
    <div>
      <div>
        import:{selectedBookId ?? "none"}:{books.map((book) => book.book_name).join(",")}
      </div>
      <button onClick={() => onChangeBook(2)}>Change import book</button>
      <button onClick={() => void Promise.resolve(onCreateBook("  Fresh Deck  ")).catch(() => {})}>
        Create book
      </button>
      <button onClick={() => void Promise.resolve(onCreateBook("   ")).catch(() => {})}>
        Create empty book
      </button>
      <button onClick={onGoToDictionaries}>Back to dictionaries</button>
      <button onClick={onStartStudySession}>Start from import</button>
    </div>
  ),
}));

vi.mock("./pages/flashcard", () => ({
  Flashcard: ({
    sessionId,
    bookId,
    bookLanguage,
    onQuit,
  }: {
    sessionId?: number | null;
    bookId?: number | null;
    bookLanguage?: string | null;
    onQuit: (stats?: {
      correct: number;
      total: number;
      duration_seconds: number;
      accuracy: number;
    }) => void;
  }) => (
    <div>
      <div>flashcard session:{sessionId ?? "none"}</div>
      <div>flashcard book:{bookId ?? "none"}</div>
      <div>flashcard language:{bookLanguage ?? "none"}</div>
      <button
        onClick={() =>
          onQuit({
            correct: 3,
            total: 4,
            duration_seconds: 60,
            accuracy: 0.75,
          })
        }
      >
        Finish session
      </button>
      <button onClick={() => onQuit()}>Quit session</button>
    </div>
  ),
}));

vi.mock("./pages/session_summary", () => ({
  SessionSummary: ({
    stats,
    onReturnToDashboard,
  }: {
    stats: {
      correct: number;
      total: number;
      duration_seconds: number;
      accuracy: number;
    };
    onReturnToDashboard: () => void;
  }) => (
    <div>
      <div>
        summary:{stats.correct}/{stats.total}:{stats.accuracy}
      </div>
      <button onClick={onReturnToDashboard}>Back to dashboard</button>
    </div>
  ),
}));

describe("App", () => {
  const setupUser = () => userEvent.setup();
  const getTodayStamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const getReviewedTodayKey = (email: string) =>
    `reviewed_today:${email.toLowerCase()}:${getTodayStamp()}`;

  beforeEach(() => {
    vi.clearAllMocks();

    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, String(value));
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        get length() {
          return storage.size;
        },
      },
      configurable: true,
    });
    window.localStorage.clear();

    loginMock.mockResolvedValue({
      success: true,
      user: {
        id: 7,
        email: "user@example.com",
        username: "user",
        selected_book_id: null,
      },
    });
    registerMock.mockResolvedValue({
      success: true,
      user: {
        id: 7,
        email: "user@example.com",
        username: "user",
        selected_book_id: null,
      },
    });
    logoutMock.mockResolvedValue({ success: true, user: {} });
    getBooksMock.mockResolvedValue([
      { id: 1, book_name: "Deck A", is_default: false, language: "en-US" },
      { id: 2, book_name: "Deck B", is_default: false, language: "es-ES" },
      { id: 3, book_name: "Fresh Deck", is_default: false, language: "it-IT" },
    ]);
    createBookMock.mockResolvedValue({
      id: 3,
      book_name: "Fresh Deck",
      is_default: false,
      language: "it-IT",
    });
    startReviewSessionMock.mockResolvedValue({
      session_id: 99,
      words: [{ user_word_id: 1, word_text: "hello", meaning: "greeting" }],
    });
    changeSelectedBookMock.mockResolvedValue({
      success: true,
      user: {
        id: 7,
        email: "user@example.com",
        username: "user",
        selected_book_id: 1,
      },
    });
    changeBookLanguageMock.mockResolvedValue({
      success: true,
      book: { id: 1, book_name: "Deck A", is_default: false, language: "en-US" },
    });
    loginMock.mockImplementation(async (email: string) => {
      switch (email) {
        case "validation@example.com":
          return { success: false, errorType: "VALIDATION" };
        case "auth@example.com":
          return { success: false, errorType: "AUTH" };
        case "network@example.com":
          return { success: false, errorType: "NETWORK" };
        case "rate@example.com":
          return { success: false, errorType: "RATE_LIMIT" };
        case "unknown@example.com":
          return { success: false, errorType: "UNKNOWN" };
        default:
          return {
            success: true,
            user: {
              id: 7,
              email,
              username: "user",
              selected_book_id: null,
            },
          };
      }
    });
    registerMock.mockImplementation(async (email: string) => {
      switch (email) {
        case "validation-register@example.com":
          return { success: false, errorType: "VALIDATION" };
        case "network-register@example.com":
          return { success: false, errorType: "NETWORK" };
        case "conflict-register@example.com":
          return { success: false, errorType: "CONFLICT" };
        case "rate-register@example.com":
          return { success: false, errorType: "RATE_LIMIT" };
        case "unknown-register@example.com":
          return { success: false, errorType: "UNKNOWN" };
        default:
          return {
            success: true,
            user: {
              id: 7,
              email,
              username: "user",
            },
          };
      }
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("logs in, loads books, and navigates to progress from the top nav", async () => {
    const user = setupUser();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldStamp = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    localStorage.setItem(getReviewedTodayKey("user@example.com"), "6");
    localStorage.setItem(`reviewed_today:user@example.com:${oldStamp}`, "2");

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));

    expect(await screen.findByText("dashboard reviewed:6")).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith("user@example.com", "secret");
    expect(getBooksMock).toHaveBeenCalled();
    expect(localStorage.getItem(`reviewed_today:user@example.com:${oldStamp}`)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Progress" }));
    expect(await screen.findByText("progress:1")).toBeInTheDocument();
  });

  it("runs register flow and reaches dashboard", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit register/i }));

    expect(await screen.findByText("dashboard reviewed:0")).toBeInTheDocument();
    expect(registerMock).toHaveBeenCalledWith("user@example.com", "secret");
  });

  it("starts a backend review session and shows flashcard session data", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));

    expect(await screen.findByText("flashcard session:99")).toBeInTheDocument();
    expect(screen.getByText("flashcard book:1")).toBeInTheDocument();
    expect(screen.getByText("flashcard language:en-US")).toBeInTheDocument();
    expect(startReviewSessionMock).toHaveBeenCalledWith(1, 5);
    expect(localStorage.getItem("active_review_session:user@example.com")).toContain(
      '"session_id":99',
    );
  });

  it("falls back to local practice mode when review start returns no words", async () => {
    const user = setupUser();
    startReviewSessionMock.mockRejectedValueOnce(new Error("no words to review"));

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));

    expect(await screen.findByText("flashcard session:none")).toBeInTheDocument();
    expect(screen.getByText("flashcard book:1")).toBeInTheDocument();
    expect(localStorage.getItem("active_review_session:user@example.com")).toBeNull();
  });

  it("ends a session, updates reviewed count, and logs out cleanly", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));
    await screen.findByText("flashcard session:99");

    await user.click(screen.getByRole("button", { name: /finish session/i }));
    expect(await screen.findByText("summary:3/4:0.75")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(await screen.findByText("dashboard reviewed:4")).toBeInTheDocument();
    expect(localStorage.getItem(getReviewedTodayKey("user@example.com"))).toBe("4");

    localStorage.setItem(
      "active_review_session:user@example.com",
      JSON.stringify({ session_id: 123 }),
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open auth/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem("active_review_session:user@example.com")).toBeNull();
    expect(logoutMock).toHaveBeenCalled();
  });

  it("shows a dashboard error when starting a session fails unexpectedly", async () => {
    const user = setupUser();
    startReviewSessionMock.mockRejectedValueOnce(new Error("server exploded"));

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));

    expect(
      await screen.findByText(/failed to start study session\. please try again\./i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/starting session/i)).not.toBeInTheDocument();
  });

  it("shows a dashboard error when no books are available for a session", async () => {
    const user = setupUser();
    getBooksMock.mockResolvedValueOnce([
      { id: 1, book_name: "Deck A", is_default: false, language: "en-US" },
      { id: 2, book_name: "Deck B", is_default: false, language: "es-ES" },
      { id: 3, book_name: "Fresh Deck", is_default: false, language: "it-IT" },
    ]).mockResolvedValueOnce([]);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));

    expect(
      await screen.findByText(/failed to start study session\. please try again\./i),
    ).toBeInTheDocument();
  });

  it("returns to the dashboard when a flashcard session is quit without stats", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /start study session/i }));
    await screen.findByText("flashcard session:99");

    await user.click(screen.getByRole("button", { name: /quit session/i }));

    expect(await screen.findByText("dashboard reviewed:0")).toBeInTheDocument();
    expect(screen.queryByText(/summary:/i)).not.toBeInTheDocument();
  });

  it("navigates through dictionaries and import pages and mutates book state", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /go dictionaries/i }));
    expect(await screen.findByText("dictionaries:1:Deck A,Deck B,Fresh Deck")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /set language fr-fr/i }));
    expect(changeBookLanguageMock).toHaveBeenCalledWith(1, "fr-FR");

    await user.click(screen.getByRole("button", { name: /choose book 2/i }));
    await waitFor(() =>
      expect(changeSelectedBookMock).toHaveBeenCalledWith(7, 2),
    );
    expect(await screen.findByText("dictionaries:2:Deck A,Deck B,Fresh Deck")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /import words/i }));
    expect(await screen.findByText("import:2:Deck A,Deck B,Fresh Deck")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /create book/i }));
    await waitFor(() => expect(createBookMock).toHaveBeenCalledWith("Fresh Deck"));
    await waitFor(() =>
      expect(changeSelectedBookMock).toHaveBeenCalledWith(7, 3),
    );

    await user.click(screen.getByRole("button", { name: /start from import/i }));
    expect(await screen.findByText("flashcard book:3")).toBeInTheDocument();
    expect(screen.getByText("flashcard language:it-IT")).toBeInTheDocument();
  });

  it("handles dictionary and import edge cases without leaving the flow", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    await user.click(screen.getByRole("button", { name: /go dictionaries/i }));
    await screen.findByText("dictionaries:1:Deck A,Deck B,Fresh Deck");

    changeBookLanguageMock.mockResolvedValueOnce({ success: false, errorType: "UNKNOWN" });
    await user.click(screen.getByRole("button", { name: /set language fr-fr/i }));
    expect(changeBookLanguageMock).toHaveBeenCalledWith(1, "fr-FR");

    changeSelectedBookMock.mockResolvedValueOnce({ success: false, errorType: "UNKNOWN" });
    await user.click(screen.getByRole("button", { name: /choose book 3/i }));
    await waitFor(() =>
      expect(changeSelectedBookMock).toHaveBeenCalledWith(7, 3),
    );
    expect(screen.getByText("dictionaries:1:Deck A,Deck B,Fresh Deck")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /choose active book/i }));

    await user.click(screen.getByRole("button", { name: /import words/i }));
    await screen.findByText("import:1:Deck A,Deck B,Fresh Deck");

    await user.click(screen.getByRole("button", { name: /create empty book/i }));
    expect(screen.getByText("import:1:Deck A,Deck B,Fresh Deck")).toBeInTheDocument();
  });

  it("executes login and register error mappings in app handlers", async () => {
    const user = setupUser();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));

    await user.click(screen.getByRole("button", { name: /login validation/i }));
    await user.click(screen.getByRole("button", { name: /login auth/i }));
    await user.click(screen.getByRole("button", { name: /login network/i }));
    await user.click(screen.getByRole("button", { name: /login rate/i }));
    await user.click(screen.getByRole("button", { name: /login unknown/i }));

    await user.click(screen.getByRole("button", { name: /register network/i }));
    await user.click(screen.getByRole("button", { name: /register validation/i }));
    await user.click(screen.getByRole("button", { name: /register conflict/i }));
    await user.click(screen.getByRole("button", { name: /register rate/i }));
    await user.click(screen.getByRole("button", { name: /register unknown/i }));

    expect(screen.getByRole("button", { name: /submit login/i })).toBeInTheDocument();
  });

  it("keeps auth flow stable when login succeeds but no books are returned", async () => {
    const user = setupUser();
    getBooksMock.mockResolvedValueOnce([]);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));

    expect(await screen.findByText("dashboard reviewed:0")).toBeInTheDocument();
  });

  it("logs out to landing even when the logout request fails", async () => {
    const user = setupUser();
    logoutMock.mockResolvedValueOnce({ success: false, errorType: "NETWORK" });

    render(<App />);

    await user.click(screen.getByRole("button", { name: /open auth/i }));
    await user.click(screen.getByRole("button", { name: /submit login/i }));
    await screen.findByText("dashboard reviewed:0");

    localStorage.setItem(
      "active_review_session:user@example.com",
      JSON.stringify({ session_id: 321 }),
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open auth/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem("active_review_session:user@example.com")).toBeNull();
    expect(logoutMock).toHaveBeenCalled();
  });
});
