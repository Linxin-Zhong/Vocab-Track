import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "./apiClient";
import {
  answerReviewWord,
  endReviewSession,
  startReviewSession,
} from "./reviewService";
import { ENDPOINTS } from "./endpoints";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("reviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a review session and normalizes words", async () => {
    mockApiRequest.mockResolvedValueOnce({
      session_id: 123,
      words: [
        { user_word_id: 1, word_text: "abate", meaning: "to lessen" },
        {
          user_word_id: 2,
          word_text: "lucid",
          meanings: ["clear", "easy to understand"],
        },
      ],
    });

    const data = await startReviewSession(10, 5);

    expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.REVIEW.START, {
      method: "POST",
      body: JSON.stringify({ book_id: 10, limit: 5 }),
    });
    expect(data).toEqual({
      session_id: 123,
      words: [
        { user_word_id: 1, word_text: "abate", meaning: "to lessen" },
        {
          user_word_id: 2,
          word_text: "lucid",
          meaning: "clear; easy to understand",
        },
      ],
    });
  });

  it("throws backend detail when no review session is created", async () => {
    mockApiRequest.mockResolvedValueOnce({
      detail: "no words to review",
    });

    await expect(startReviewSession(10, 5)).rejects.toThrow(
      /no words to review/i,
    );
  });

  it("throws a fallback error when backend returns null", async () => {
    mockApiRequest.mockResolvedValueOnce(null);

    await expect(startReviewSession(10, 5)).rejects.toThrow(
      /failed to start review session/i,
    );
  });

  it("throws a fallback error when backend returns a non-object JSON type", async () => {
    mockApiRequest.mockResolvedValueOnce("unexpected response");

    await expect(startReviewSession(10, 5)).rejects.toThrow(
      /failed to start review session/i,
    );
  });

  it("submits a review answer", async () => {
    mockApiRequest.mockResolvedValueOnce({
      user_word_id: 8,
      word_text: "abate",
      is_correct: true,
      pre_ease_factor: 1,
      post_ease_factor: 2,
      next_review_time: "2026-03-03T00:00:00Z",
    });

    const data = await answerReviewWord(22, 8, true);

    expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.REVIEW.ANSWER, {
      method: "POST",
      body: JSON.stringify({
        session_id: 22,
        user_word_id: 8,
        is_correct: true,
      }),
    });
    expect(data.is_correct).toBe(true);
  });

  it("ends a review session", async () => {
    mockApiRequest.mockResolvedValueOnce({
      session_id: 22,
      duration_seconds: 15,
      total: 5,
      correct: 3,
      accuracy: 0.6,
    });

    const data = await endReviewSession(22);

    expect(mockApiRequest).toHaveBeenCalledWith(ENDPOINTS.REVIEW.END, {
      method: "POST",
      body: JSON.stringify({ session_id: 22 }),
    });
    expect(data.correct).toBe(3);
  });
});
