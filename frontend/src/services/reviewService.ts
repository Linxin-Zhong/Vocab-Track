import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type StartReviewSessionRequest = {
  book_id: number;
  limit: number;
};

type StartReviewSessionWordApi = {
  user_word_id: number;
  word_text: string;
  meaning?: string | null;
  meanings?: string[] | null;
};

type StartReviewSessionApiResponse = {
  session_id: number;
  words: StartReviewSessionWordApi[];
};

type StartReviewSessionEmptyResponse = {
  detail: string;
};

export type ReviewSessionWord = {
  user_word_id: number;
  word_text: string;
  meaning: string;
};

export type StartReviewSessionResponse = {
  session_id: number;
  words: ReviewSessionWord[];
};

export type ReviewAnswerResponse = {
  user_word_id: number;
  word_text: string;
  is_correct: boolean;
  pre_ease_factor: number;
  post_ease_factor: number;
  next_review_time: string;
};

export type EndReviewSessionResponse = {
  session_id: number;
  duration_seconds: number;
  total: number;
  correct: number;
  accuracy: number;
};

function normalizeMeaning(word: StartReviewSessionWordApi): string {
  // Docs/examples vary between `meaning` and `meanings`; normalize to one string.
  if (word.meaning && word.meaning.trim()) return word.meaning;
  if (Array.isArray(word.meanings) && word.meanings.length > 0) {
    return word.meanings.join("; ");
  }
  return "";
}

export async function startReviewSession(
  bookId: number,
  limit: number,
): Promise<StartReviewSessionResponse> {
  const payload: StartReviewSessionRequest = {
    book_id: bookId,
    limit,
  };

  const data = await apiRequest<
    StartReviewSessionApiResponse | StartReviewSessionEmptyResponse
  >(
    ENDPOINTS.REVIEW.START,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  // Backend may return 200 with a `detail` payload (e.g., no words due).
  if (!("session_id" in data) || typeof data.session_id !== "number") {
    const message =
      "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "Failed to start review session";
    throw new Error(message);
  }

  return {
    session_id: data.session_id,
    words: (data.words ?? []).map((word) => ({
      user_word_id: word.user_word_id,
      word_text: word.word_text,
      meaning: normalizeMeaning(word),
    })),
  };
}

export async function answerReviewWord(
  sessionId: number,
  userWordId: number,
  isCorrect: boolean,
): Promise<ReviewAnswerResponse> {
  return apiRequest<ReviewAnswerResponse>(ENDPOINTS.REVIEW.ANSWER, {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      user_word_id: userWordId,
      is_correct: isCorrect,
    }),
  });
}

export async function endReviewSession(
  sessionId: number,
): Promise<EndReviewSessionResponse> {
  return apiRequest<EndReviewSessionResponse>(ENDPOINTS.REVIEW.END, {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
}
