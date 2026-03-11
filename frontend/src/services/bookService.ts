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

type ApiBook = {
  id?: number;
  book_id?: number;
  book_name?: string;
  is_default?: boolean;
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

function normalizeBook(data: unknown): Book | null {
  if (!data || typeof data !== "object") return null;

  const row = data as ApiBook;
  const normalizedId = row.id ?? row.book_id;
  if (typeof normalizedId !== "number" || typeof row.book_name !== "string") {
    return null;
  }

  return {
    id: normalizedId,
    book_name: row.book_name,
    is_default: Boolean(row.is_default),
  };
}

export async function getBooks(): Promise<Book[]> {
  // GET /book/
  const data = await apiRequest<Book[] | PaginatedResponse<Book>>(
    ENDPOINTS.BOOK.BASE,
  );
  const rows = normalizeListResponse<unknown>(data);
  return rows
    .map((row) => normalizeBook(row))
    .filter((book): book is Book => book !== null);
}

export async function getWordsByBookId(bookId: number): Promise<Word[]> {
  // GET /book/{bookId}/word/
  const data = await apiRequest<Word[] | PaginatedResponse<Word>>(
    ENDPOINTS.BOOK.WORDS(bookId),
  );
  return normalizeListResponse(data);
}

export async function createBook(bookName: string): Promise<Book> {
  const payload = { book_name: bookName.trim() };
  const data = await apiRequest<unknown>(ENDPOINTS.BOOK.BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const book = normalizeBook(data);
  if (!book) {
    throw new Error("Book was created, but the response format was invalid.");
  }

  return book;
}
