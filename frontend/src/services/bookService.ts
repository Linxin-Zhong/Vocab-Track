import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type Book = {
  id: number;
  book_name: string;
  is_default: boolean;
};

export type Word = {
  id: number;
  word_text: string;
  meaning: string;
  example?: string | null;
  difficulty: number;
};

type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  if (!data || typeof data !== "object") return false;
  return "results" in data && Array.isArray((data as any).results);
}

function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (isPaginatedResponse<T>(data)) return data.results;

  if (import.meta.env.DEV) {
    console.error("Unexpected list response shape:", data);
  }
  return [];
}

export async function getBooks(): Promise<Book[]> {
  // GET /book/
  const data = await apiRequest<Book[] | PaginatedResponse<Book>>(
    ENDPOINTS.BOOK.BASE,
  );
  return normalizeListResponse(data);
}

export async function getWordsByBookId(bookId: number): Promise<Word[]> {
  // GET /book/{bookId}/word/
  const data = await apiRequest<Word[] | PaginatedResponse<Word>>(
    ENDPOINTS.BOOK.WORDS(bookId),
  );
  return normalizeListResponse(data);
}
