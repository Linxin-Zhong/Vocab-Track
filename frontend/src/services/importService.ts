import { ENDPOINTS } from "./endpoints";
import { apiRequest } from "./apiRequest";

type ImportedWord = {
  book_word_id: number;
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
  return apiRequest<unknown>(ENDPOINTS.BOOK.WORDS(bookId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entries),
  });
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
