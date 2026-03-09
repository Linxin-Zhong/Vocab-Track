import type { User } from "../types/auth";
import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type ChangeBookResult =
  | { success: true; user: User }
  | { success: false; errorType: "UNKNOWN" };

export async function changeSelectedBook(
  userId: number,
  bookId: number
): Promise<ChangeBookResult> {
  try {
    const url = `${ENDPOINTS.USER.BASE}${userId}/`;
    const user = await apiRequest<User>(
    url,
    {
      method: "PATCH",
      body: JSON.stringify({ selected_book_id: bookId })
    },
  );
    return { success: true, user: user };
  } catch (error) {
    console.error("changeSelectedBook error:", error);
    return { success: false, errorType: "UNKNOWN" };
  }
}