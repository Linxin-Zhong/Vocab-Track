import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import { changeSelectedBook } from "./selectedBookService";

vi.mock("./apiClient", () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe("selectedBookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches selected_book_id for the given user", async () => {
    const user = {
      id: 8,
      email: "test@example.com",
      username: "tester",
      selected_book_id: 12,
    };
    mockApiRequest.mockResolvedValueOnce(user);

    const result = await changeSelectedBook(8, 12);

    expect(mockApiRequest).toHaveBeenCalledWith("/user/8/", {
      method: "PATCH",
      body: JSON.stringify({ selected_book_id: 12 }),
    });
    expect(result).toEqual({ success: true, user });
  });

  it("returns UNKNOWN when the request fails", async () => {
    mockApiRequest.mockRejectedValueOnce(new Error("boom"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await changeSelectedBook(1, 2);

    expect(result).toEqual({ success: false, errorType: "UNKNOWN" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
