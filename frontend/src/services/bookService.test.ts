import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { createBook, getBooks, getWordsByBookId } from "./bookService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("bookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBooks", () => {
    it("normalizes backend book_id to id", async () => {
      mockApiRequest.mockResolvedValueOnce([
        { book_id: 11, book_name: "Core 1", is_default: true },
      ]);

      const result = await getBooks();

      expect(result).toEqual([{ id: 11, book_name: "Core 1", is_default: true }]);
    });

    it("returns books when API returns an array", async () => {
      const books = [{ id: 1, book_name: "Core 1", is_default: true }];
      mockApiRequest.mockResolvedValueOnce(books);

      const result = await getBooks();

      expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.BASE);
      expect(result).toEqual(books);
    });

    it("returns paginated results when API returns { results }", async () => {
      const books = [{ id: 2, book_name: "Deck A", is_default: false }];
      mockApiRequest.mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: books,
      });

      const result = await getBooks();

      expect(result).toEqual(books);
    });

    it("returns empty list on unexpected response shape", async () => {
      mockApiRequest.mockResolvedValueOnce({ data: [] });

      const result = await getBooks();

      expect(result).toEqual([]);
    });
  });

  describe("getWordsByBookId", () => {
    it("normalizes backend book_word_id to id", async () => {
      mockApiRequest.mockResolvedValueOnce([
        {
          book_word_id: 101,
          word_text: "abate",
          meaning: "to lessen",
          example: null,
          difficulty: 2,
        },
      ]);

      const result = await getWordsByBookId(7);

      expect(result).toEqual([
        {
          id: 101,
          word_text: "abate",
          meaning: "to lessen",
          example: null,
          difficulty: 2,
        },
      ]);
    });

    it("calls words endpoint with the provided book id", async () => {
      const words = [
        { id: 1, word_text: "abate", meaning: "to lessen", difficulty: 2 },
      ];
      mockApiRequest.mockResolvedValueOnce(words);

      const result = await getWordsByBookId(7);

      expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.WORDS(7));
      expect(result).toEqual([{ ...words[0], example: null }]);
    });

    it("returns paginated word results", async () => {
      const words = [
        { id: 4, word_text: "lucid", meaning: "clear", difficulty: 1 },
      ];
      mockApiRequest.mockResolvedValueOnce({ results: words });

      const result = await getWordsByBookId(3);

      expect(result).toEqual([{ ...words[0], example: null }]);
    });

    it("returns empty list on unexpected response shape", async () => {
      mockApiRequest.mockResolvedValueOnce("invalid-shape");

      const result = await getWordsByBookId(3);

      expect(result).toEqual([]);
    });
  });

  describe("createBook", () => {
    it("posts to /book/ and normalizes backend book_id to id", async () => {
      mockApiRequest.mockResolvedValueOnce({
        book_id: 14,
        book_name: "Core 2",
        is_default: false,
      });

      const result = await createBook("  Core 2  ");

      expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.BASE, {
        method: "POST",
        body: JSON.stringify({ book_name: "Core 2" }),
      });
      expect(result).toEqual({
        id: 14,
        book_name: "Core 2",
        is_default: false,
      });
    });

    it("throws when the created book response is missing required fields", async () => {
      mockApiRequest.mockResolvedValueOnce({
        book_id: 14,
        is_default: false,
      });

      await expect(createBook("Core 2")).rejects.toThrow(
        "Book was created, but the response format was invalid.",
      );
    });
  });
});
