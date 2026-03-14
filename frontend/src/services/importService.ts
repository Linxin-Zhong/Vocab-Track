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
): Promise<any> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.BOOK.WORDS(bookId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Token ${token}` }),
    },
    body: JSON.stringify(entries),
  });

  let responseData: any;
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
    const error = new Error(
      responseData?.message ?? "Failed to import words.",
    ) as Error & { status?: number };
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

  return {
    message: responseData?.message ?? "Words added successfully.",
    created: Array.isArray(responseData?.created) ? responseData.created : [],
    failed: Array.isArray(responseData?.failed) ? responseData.failed : [],
  };
}
