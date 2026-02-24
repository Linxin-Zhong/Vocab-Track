import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { getBooks, getWordsByBookId } from "./bookService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("bookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBooks", () => {
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
    it("calls words endpoint with the provided book id", async () => {
      const words = [
        { id: 1, word_text: "abate", meaning: "to lessen", difficulty: 2 },
      ];
      mockApiRequest.mockResolvedValueOnce(words);

      const result = await getWordsByBookId(7);

      expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.WORDS(7));
      expect(result).toEqual(words);
    });

    it("returns paginated word results", async () => {
      const words = [
        { id: 4, word_text: "lucid", meaning: "clear", difficulty: 1 },
      ];
      mockApiRequest.mockResolvedValueOnce({ results: words });

      const result = await getWordsByBookId(3);

      expect(result).toEqual(words);
    });

    it("returns empty list on unexpected response shape", async () => {
      mockApiRequest.mockResolvedValueOnce("invalid-shape");

      const result = await getWordsByBookId(3);

      expect(result).toEqual([]);
    });
  });
});
