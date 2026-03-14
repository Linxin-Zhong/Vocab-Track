import { ENDPOINTS } from "./endpoints";
import { getAccessToken } from "./authService";

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

  const parseJson = async (): Promise<unknown> => response.json();

  if (!response.ok) {
    let message = "Failed to import words.";

    try {
      const errorData = await parseJson();
      if (typeof errorData === "object" && errorData !== null) {
        const maybeMessage =
          "message" in errorData
            ? errorData.message
            : "detail" in errorData
              ? errorData.detail
              : undefined;

        if (typeof maybeMessage === "string" && maybeMessage.trim()) {
          message = maybeMessage;
        }
      }
    } catch {
      // Fall back to the import-specific generic error when the response body is invalid.
    }

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return parseJson();
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
