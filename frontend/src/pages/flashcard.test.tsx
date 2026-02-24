import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Flashcard } from "./flashcard";
import { getBooks, getWordsByBookId } from "../services/bookService";

vi.mock("../services/bookService", () => ({
  getBooks: vi.fn(),
  getWordsByBookId: vi.fn(),
}));

const mockGetBooks = vi.mocked(getBooks);
const mockGetWordsByBookId = vi.mocked(getWordsByBookId);

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
});
