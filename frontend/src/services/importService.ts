import { getAccessToken } from "./authService";
import { ENDPOINTS } from "./endpoints";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type ImportedWord = {
  book_word_id: number;
  word_text: string;
  meaning: string;
  example: string;
  difficulty: number;
};

type FailedImport = {
  word_text: string;
  reason: string;
  book_word_id?: number;
};

export type ImportWordPayload = {
  word_text: string;
  meaning: string;
  example?: string;
  difficulty?: number;
};

export type ImportWordsResponse = {
  message: string;
  created: ImportedWord[];
  failed: FailedImport[];
};

async function requestImportWords(
  bookId: number,
  entries: ImportWordPayload[],
): Promise<unknown> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.BOOK.WORDS(bookId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Token ${token}` }),
    },
    body: JSON.stringify(entries),
  });

  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch (err) {
    if (!response.ok) {
      // For non-OK responses, fall back to an empty object so we can still
      // surface a meaningful error message.
      responseData = {};
    } else {
      // For successful responses, surface JSON parse errors instead of
      // silently normalizing to an empty object.
      throw err;
    }
  }

  if (!response.ok) {
    let errorMessage = "Failed to import words.";
    if (typeof responseData === "object" && responseData !== null) {
      const maybeMessage = (responseData as { message?: unknown }).message;
      const maybeDetail = (responseData as { detail?: unknown }).detail;
      if (typeof maybeMessage === "string") {
        errorMessage = maybeMessage;
      } else if (typeof maybeDetail === "string") {
        errorMessage = maybeDetail;
      }
    }

    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return responseData;
}

export async function importWordsEntries(
  bookId: number,
  entries: ImportWordPayload[],
): Promise<ImportWordsResponse> {
  const responseData = await requestImportWords(bookId, entries);

  let message = "Words added successfully.";
  let created: ImportedWord[] = [];
  let failed: FailedImport[] = [];

  if (typeof responseData === "object" && responseData !== null) {
    const maybeMessage = (responseData as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      message = maybeMessage;
    }

    const maybeCreated = (responseData as { created?: unknown }).created;
    if (Array.isArray(maybeCreated)) {
      created = maybeCreated as ImportedWord[];
    }

    const maybeFailed = (responseData as { failed?: unknown }).failed;
    if (Array.isArray(maybeFailed)) {
      failed = maybeFailed as FailedImport[];
    }
  }

  return {
    message,
    created,
    failed,
  };
}
