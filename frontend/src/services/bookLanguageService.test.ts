import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { changeBookLanguage } from "./bookLanguageService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("bookLanguageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the selected book language", async () => {
    const book = {
      id: 9,
      book_name: "French Deck",
      is_default: false,
      language: "fr-FR",
    };
    mockApiRequest.mockResolvedValueOnce(book);

    const result = await changeBookLanguage(9, "fr-FR");

    expect(mockApiRequest).toHaveBeenCalledWith("/book/9/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: "fr-FR" }),
    });
    expect(result).toEqual({ success: true, book });
  });

  it("allows clearing the book language", async () => {
    const book = {
      id: 9,
      book_name: "French Deck",
      is_default: false,
      language: null,
    };
    mockApiRequest.mockResolvedValueOnce(book);

    const result = await changeBookLanguage(9, null);

    expect(mockApiRequest).toHaveBeenCalledWith("/book/9/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: null }),
    });
    expect(result).toEqual({ success: true, book });
  });

  it("returns UNKNOWN when the request fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApiRequest.mockRejectedValueOnce(new Error("boom"));

    const result = await changeBookLanguage(9, "en-US");

    expect(result).toEqual({ success: false, errorType: "UNKNOWN" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
