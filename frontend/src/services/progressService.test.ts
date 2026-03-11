import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import {
  getProgressData,
  getProgressDictionaryOptions,
} from "./progressService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("progressService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes dictionary options from array response", async () => {
    mockApiRequest.mockResolvedValueOnce([
      { book_id: 10, book_name: "General Vocabulary" },
      { id: 11, book_name: "Academic Vocabulary" },
      { id: "bad-id", book_name: "Ignored" },
      { id: 12, book_name: "" },
    ]);

    const data = await getProgressDictionaryOptions();

    expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.BASE);
    expect(data).toEqual([
      { key: 10, label: "General Vocabulary" },
      { key: 11, label: "Academic Vocabulary" },
    ]);
  });

  it("normalizes dictionary options from paginated response", async () => {
    mockApiRequest.mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: [{ book_id: 21, book_name: "TOEFL Vocabulary" }],
    });

    const data = await getProgressDictionaryOptions();

    expect(data).toEqual([{ key: 21, label: "TOEFL Vocabulary" }]);
  });

  it("returns empty dictionary options for unexpected response shape", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: [] });

    const data = await getProgressDictionaryOptions();

    expect(data).toEqual([]);
  });

  it("normalizes progress detail payload with rw_trend and rw_words", async () => {
    mockApiRequest.mockResolvedValueOnce({
      words_rw_count: 8,
      days_active: 3,
      avg_accuracy: 1.2,
      rw_trend: [
        { date: "2026-03-05", count: 2, accuracy: 0.5 },
        { date: "2026-03-06", count: 0, accuracy: 0.9 },
        { date: "2026-03-07", count: 3, accuracy: -0.2 },
        { date: "bad", count: "bad-count", accuracy: 0.8 },
      ],
      rw_words: [
        {
          book_word_id: 301,
          word_text: "abate",
          accuracy: 0.75,
          times_reviewed: 4,
          difficulty: 2,
        },
        {
          book_word_id: "x-302",
          word_text: "lucid",
          accuracy: 1.4,
          times_reviewed: 2,
          difficulty: "Easy",
        },
        {
          book_word_id: 303,
          word_text: "invalid",
          accuracy: 0.7,
          times_reviewed: 2,
          difficulty: 9,
        },
      ],
    });

    const data = await getProgressData(99);

    expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.BOOK.DETAIL(99));
    expect(data).toEqual({
      summary: {
        wordsStudied: 8,
        daysActive: 3,
        avgAccuracy: 1,
      },
      dailyActivity: [
        { date: "2026-03-05", count: 2 },
        { date: "2026-03-06", count: 0 },
        { date: "2026-03-07", count: 3 },
      ],
      dailyAccuracy: [
        { date: "2026-03-05", accuracy: 0.5 },
        { date: "2026-03-07", accuracy: 0 },
      ],
      wordPerformance: [
        {
          wordId: 301,
          wordText: "abate",
          accuracy: 0.75,
          reviewCount: 4,
          difficulty: "Medium",
          dictionaryKey: 99,
        },
        {
          wordId: "x-302",
          wordText: "lucid",
          accuracy: 1,
          reviewCount: 2,
          difficulty: "Easy",
          dictionaryKey: 99,
        },
      ],
    });
  });

  it("uses empty arrays when rw_trend or rw_words are missing", async () => {
    mockApiRequest.mockResolvedValueOnce({
      words_rw_count: 0,
      days_active: 0,
      avg_accuracy: 0,
    });

    const data = await getProgressData(5);

    expect(data).toEqual({
      summary: {
        wordsStudied: 0,
        daysActive: 0,
        avgAccuracy: 0,
      },
      dailyActivity: [],
      dailyAccuracy: [],
      wordPerformance: [],
    });
  });

  it("maps all supported difficulty variants", async () => {
    mockApiRequest.mockResolvedValueOnce({
      words_rw_count: 3,
      days_active: 1,
      avg_accuracy: 0.6,
      rw_trend: [],
      rw_words: [
        {
          book_word_id: 1,
          word_text: "one",
          accuracy: 0.1,
          times_reviewed: 1,
          difficulty: 1,
        },
        {
          book_word_id: 2,
          word_text: "two",
          accuracy: 0.2,
          times_reviewed: 2,
          difficulty: 2,
        },
        {
          book_word_id: 3,
          word_text: "three",
          accuracy: 0.3,
          times_reviewed: 3,
          difficulty: 3,
        },
        {
          book_word_id: 4,
          word_text: "four",
          accuracy: 0.4,
          times_reviewed: 4,
          difficulty: "Easy",
        },
        {
          book_word_id: 5,
          word_text: "five",
          accuracy: 0.5,
          times_reviewed: 5,
          difficulty: "Medium",
        },
        {
          book_word_id: 6,
          word_text: "six",
          accuracy: 0.6,
          times_reviewed: 6,
          difficulty: "Hard",
        },
      ],
    });

    const data = await getProgressData(7);

    expect(data.wordPerformance.map((row) => row.difficulty)).toEqual([
      "Easy",
      "Medium",
      "Hard",
      "Easy",
      "Medium",
      "Hard",
    ]);
  });

  it("clamps negative summary and word/trend accuracy values to 0", async () => {
    mockApiRequest.mockResolvedValueOnce({
      words_rw_count: 2,
      days_active: 1,
      avg_accuracy: -0.4,
      rw_trend: [{ date: "2026-03-10", count: 1, accuracy: -0.7 }],
      rw_words: [
        {
          book_word_id: 77,
          word_text: "clamp",
          accuracy: -0.2,
          times_reviewed: 1,
          difficulty: "Hard",
        },
      ],
    });

    const data = await getProgressData(77);

    expect(data.summary.avgAccuracy).toBe(0);
    expect(data.dailyAccuracy).toEqual([{ date: "2026-03-10", accuracy: 0 }]);
    expect(data.wordPerformance[0]?.accuracy).toBe(0);
  });

  it("throws for invalid non-object progress payload", async () => {
    mockApiRequest.mockResolvedValueOnce(null);
    await expect(getProgressData(1)).rejects.toThrow(/invalid progress response/i);
  });

  it("throws when required summary fields are missing or invalid", async () => {
    mockApiRequest.mockResolvedValueOnce({
      words_rw_count: 10,
      // days_active missing
      avg_accuracy: 0.8,
      rw_trend: [],
      rw_words: [],
    });

    await expect(getProgressData(1)).rejects.toThrow(
      /progress summary is missing required fields/i,
    );
  });
});
