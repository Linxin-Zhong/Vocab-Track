import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Flashcard } from "./flashcard";
import { getBooks, getWordsByBookId } from "../services/bookService";
import { answerReviewWord } from "../services/reviewService";
import { endReviewSession } from "../services/reviewService";

vi.mock("../services/bookService", () => ({
  getBooks: vi.fn(),
  getWordsByBookId: vi.fn(),
}));
vi.mock("../services/reviewService", () => ({
  answerReviewWord: vi.fn(),
  endReviewSession: vi.fn(),
}));

const mockGetBooks = vi.mocked(getBooks);
const mockGetWordsByBookId = vi.mocked(getWordsByBookId);
const mockAnswerReviewWord = vi.mocked(answerReviewWord);
const mockEndReviewSession = vi.mocked(endReviewSession);

describe("Flashcard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading first and then renders no words state when no books", async () => {
    mockGetBooks.mockResolvedValueOnce([]);

    render(<Flashcard onQuit={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByText(/no words to review/i)).toBeInTheDocument();
    expect(mockGetWordsByBookId).not.toHaveBeenCalled();
  });

  it("shows error state when fetching books fails", async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    mockGetBooks.mockRejectedValueOnce(new Error("boom"));

    render(<Flashcard onQuit={onQuit} />);

    expect(
      await screen.findByText(/failed to load flashcards/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /quit session/i }));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it("loads words from non-default book first", async () => {
    mockGetBooks.mockResolvedValueOnce([
      { id: 1, book_name: "Default", is_default: true },
      { id: 2, book_name: "My Deck", is_default: false },
    ]);
    mockGetWordsByBookId.mockResolvedValueOnce([
      { id: 10, word_text: "abate", meaning: "to lessen", difficulty: 2 },
    ]);

    render(<Flashcard onQuit={vi.fn()} />);

    expect(await screen.findByText(/card 1 of 1/i)).toBeInTheDocument();
    expect(mockGetWordsByBookId).toHaveBeenCalledWith(2);
    expect(screen.getByRole("heading", { name: "abate" })).toBeInTheDocument();
  });

  it("reveals answer content after clicking Show Answer", async () => {
    const user = userEvent.setup();
    mockGetBooks.mockResolvedValueOnce([
      { id: 3, book_name: "Deck", is_default: false },
    ]);
    mockGetWordsByBookId.mockResolvedValueOnce([
      {
        id: 11,
        word_text: "lucid",
        meaning: "clear and easy to understand",
        example: "A lucid explanation",
        difficulty: 1,
      },
    ]);

    render(<Flashcard onQuit={vi.fn()} />);

    await screen.findByRole("heading", { name: "lucid" });
    expect(
      screen.queryByText(/clear and easy to understand/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /show answer/i }));

    expect(
      screen.getByText(/clear and easy to understand/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/a lucid explanation/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /i knew this/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /i didn't know this/i }),
    ).toBeInTheDocument();
  });

  it("quits from normal study state", async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    mockGetBooks.mockResolvedValueOnce([
      { id: 4, book_name: "Deck", is_default: true },
    ]);
    mockGetWordsByBookId.mockResolvedValueOnce([
      { id: 99, word_text: "zeal", meaning: "great energy", difficulty: 2 },
    ]);

    render(<Flashcard onQuit={onQuit} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /zeal/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /quit session/i }));

    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it("moves to the next card and resets to question view after marking known", async () => {
    const user = userEvent.setup();
    mockGetBooks.mockResolvedValueOnce([
      { id: 6, book_name: "Deck", is_default: false },
    ]);
    mockGetWordsByBookId.mockResolvedValueOnce([
      {
        id: 21,
        word_text: "lucid",
        meaning: "clear and easy to understand",
        difficulty: 1,
      },
      {
        id: 22,
        word_text: "zeal",
        meaning: "great energy",
        difficulty: 2,
      },
    ]);

    render(<Flashcard onQuit={vi.fn()} />);

    await screen.findByRole("heading", { name: "lucid" });
    await user.click(screen.getByRole("button", { name: /show answer/i }));
    expect(
      screen.getByRole("button", { name: /i knew this/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /i knew this/i }));

    expect(await screen.findByRole("heading", { name: "zeal" })).toBeInTheDocument();
    expect(screen.getByText(/card 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show answer/i })).toBeInTheDocument();
    expect(screen.queryByText(/great energy/i)).not.toBeInTheDocument();
  });

  it("completes the session and calls onQuit after final card", async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    mockGetBooks.mockResolvedValueOnce([
      { id: 7, book_name: "Deck", is_default: false },
    ]);
    mockGetWordsByBookId.mockResolvedValueOnce([
      {
        id: 31,
        word_text: "abate",
        meaning: "to lessen",
        difficulty: 1,
      },
    ]);

    render(<Flashcard onQuit={onQuit} />);

    await screen.findByRole("heading", { name: "abate" });
    await user.click(screen.getByRole("button", { name: /show answer/i }));
    await user.click(screen.getByRole("button", { name: /i didn't know this/i }));

    await waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
  });

  it("falls back to local quit when ending a backend session fails", async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    mockGetWordsByBookId.mockResolvedValueOnce([
      { id: 10, word_text: "abate", meaning: "to lessen", difficulty: 2 },
    ]);
    mockEndReviewSession.mockRejectedValueOnce(new Error("boom"));

    render(
      <Flashcard
        onQuit={onQuit}
        sessionId={12}
        bookId={2}
        sessionWords={[{ user_word_id: 10, word_text: "abate", meaning: "to lessen" }]}
      />,
    );

    await screen.findByRole("heading", { name: /abate/i });
    await user.click(screen.getByRole("button", { name: /quit session/i }));

    await waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
  });

  it("shows ending state (not no-words state) while backend session is completing", async () => {
    const onQuit = vi.fn();
    const user = userEvent.setup();
    let resolveEndSession: ((value: {
      session_id: number;
      duration_seconds: number;
      total: number;
      correct: number;
      accuracy: number;
    }) => void) | null = null;

    mockGetWordsByBookId.mockResolvedValueOnce([
      { id: 10, word_text: "abate", meaning: "to lessen", difficulty: 2 },
    ]);
    mockAnswerReviewWord.mockResolvedValueOnce({
      user_word_id: 10,
      word_text: "abate",
      is_correct: true,
      pre_ease_factor: 1,
      post_ease_factor: 2,
      next_review_time: "2026-03-03T00:00:00Z",
    });
    mockEndReviewSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveEndSession = resolve;
        }),
    );

    render(
      <Flashcard
        onQuit={onQuit}
        sessionId={12}
        bookId={2}
        sessionWords={[{ user_word_id: 10, word_text: "abate", meaning: "to lessen" }]}
      />,
    );

    await screen.findByRole("heading", { name: /abate/i });
    await user.click(screen.getByRole("button", { name: /show answer/i }));
    await user.click(screen.getByRole("button", { name: /i knew this/i }));

    expect(await screen.findByText(/ending session/i)).toBeInTheDocument();
    expect(screen.queryByText(/no words to review/i)).not.toBeInTheDocument();
    expect(onQuit).not.toHaveBeenCalled();

    resolveEndSession?.({
      session_id: 12,
      duration_seconds: 15,
      total: 1,
      correct: 1,
      accuracy: 1,
    });

    await waitFor(() => expect(onQuit).toHaveBeenCalledTimes(1));
  });
});
