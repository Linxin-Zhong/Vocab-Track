import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type Book = {
  id: number;
  book_name: string;
  is_default: boolean;
  language: string|null|undefined;
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

// Keep raw API types separate from app types:
// backend may return `book_id`/`book_word_id`, while the app consistently uses `id`.
type BackendBook = {
  id?: number;
  book_id?: number;
  book_name?: string;
  is_default?: boolean;
  language?: string | null;
};

type BackendWord = {
  id?: number;
  book_word_id?: number;
  word_text?: string;
  meaning?: string;
  example?: string | null;
  difficulty?: number;
};

function isPaginatedResponse<T>(data: unknown): data is PaginatedResponse<T> {
  if (!data || typeof data !== "object") return false;
  return "results" in data && Array.isArray((data as { results?: unknown }).results);
}

function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (isPaginatedResponse<T>(data)) return data.results;

  if (import.meta.env.DEV) {
    console.error("Unexpected list response shape:", data);
  }
  return [];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeBook(row: BackendBook): Book | null {
  const id = row.id ?? row.book_id;
  if (
    !isFiniteNumber(id) ||
    typeof row.book_name !== "string" ||
    typeof row.is_default !== "boolean"
  ) {
    return null;
  }
  return {
    id,
    book_name: row.book_name,
    is_default: row.is_default,
    language: row.language
  };
}

function normalizeWord(row: BackendWord): Word | null {
  const id = row.id ?? row.book_word_id;
  if (
    !isFiniteNumber(id) ||
    typeof row.word_text !== "string" ||
    typeof row.meaning !== "string" ||
    !isFiniteNumber(row.difficulty)
  ) {
    return null;
  }
  return {
    id,
    word_text: row.word_text,
    meaning: row.meaning,
    example: row.example ?? null,
    difficulty: row.difficulty,
  };
}

export async function getBooks(): Promise<Book[]> {
  // GET /book/
  const data = await apiRequest<BackendBook[] | PaginatedResponse<BackendBook>>(
    ENDPOINTS.BOOK.BASE,
  );
  console.log("Raw book data from API:", data);
  return normalizeListResponse<BackendBook>(data)
    .map(normalizeBook)
    .filter((book): book is Book => book !== null);
}

export async function getWordsByBookId(bookId: number): Promise<Word[]> {
  // GET /book/{bookId}/word/
  const data = await apiRequest<BackendWord[] | PaginatedResponse<BackendWord>>(
    ENDPOINTS.BOOK.WORDS(bookId),
  );
  return normalizeListResponse<BackendWord>(data)
    .map(normalizeWord)
    .filter((word): word is Word => word !== null);
}

export async function createBook(bookName: string): Promise<Book> {
  const payload = { book_name: bookName.trim() };
  const data = await apiRequest<BackendBook>(ENDPOINTS.BOOK.BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const book = normalizeBook(data);
  if (!book) {
    throw new Error("Book was created, but the response format was invalid.");
  }

  return book;
}
