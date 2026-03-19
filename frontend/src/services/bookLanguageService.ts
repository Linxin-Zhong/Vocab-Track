import type { Book } from "./bookService";
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type ChangeBookLanguageResult =
  | { success: true; book: Book }
  | { success: false; errorType: "UNKNOWN" };

export async function changeBookLanguage(
  bookId: number,
  language: string | null
): Promise<ChangeBookLanguageResult> {
  try {
    const url = `${ENDPOINTS.BOOK.BASE}${bookId}/`;

    const updatedBook = await apiRequest<Book>(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language }),
    });

    return { success: true, book: updatedBook };
  } catch (error) {
    console.error("changeBookLanguage error:", error);
    return { success: false, errorType: "UNKNOWN" };
  }
}