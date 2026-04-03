import { beforeEach, describe, expect, it, vi } from "vitest";
import { importWordsEntries } from "./importService";

vi.mock("./authService", () => ({
  getAccessToken: vi.fn(() => "fake-token-123"),
}));

describe("importService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("posts import entries to the book words endpoint with auth header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Words added successfully.",
        created: [
          {
            book_word_id: 1,
            word_text: "abate",
            meaning: "to lessen",
            example: "The storm abated.",
            difficulty: 2,
          },
        ],
        failed: [],
      }),
    } as Response);

    const payload = [
      {
        word_text: "abate",
        meaning: "to lessen",
        example: "The storm abated.",
        difficulty: 2,
      },
    ];

    const result = await importWordsEntries(7, payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/book\/7\/word\/$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Token fake-token-123",
        }),
        body: JSON.stringify(payload),
      }),
    );
    expect(result.created).toHaveLength(1);
    expect(result.failed).toEqual([]);
  });

  it("normalizes missing created and failed arrays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Words added successfully.",
      }),
    } as Response);

    const result = await importWordsEntries(3, [
      { word_text: "lucid", meaning: "clear" },
    ]);

    expect(result).toEqual({
      message: "Words added successfully.",
      created: [],
      failed: [],
    });
  });

  it("throws backend message on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        message: "Dictionary name is required.",
      }),
    } as Response);

    await expect(
      importWordsEntries(5, [{ word_text: "keen", meaning: "eager" }]),
    ).rejects.toMatchObject({
      message: "Dictionary name is required.",
      status: 400,
    });
  });

  it("falls back to generic error message when error response has no json body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response);

    await expect(
      importWordsEntries(5, [{ word_text: "keen", meaning: "eager" }]),
    ).rejects.toMatchObject({
      message: "Failed to import words.",
      status: 500,
    });
  });

  it("uses backend detail field when message is absent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: "Import payload is invalid.",
      }),
    } as Response);

    await expect(
      importWordsEntries(5, [{ word_text: "keen", meaning: "eager" }]),
    ).rejects.toMatchObject({
      message: "Import payload is invalid.",
      status: 422,
    });
  });

  it("falls back to the default message when error json has no message fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        code: "bad_request",
      }),
    } as Response);

    await expect(
      importWordsEntries(5, [{ word_text: "keen", meaning: "eager" }]),
    ).rejects.toMatchObject({
      message: "Failed to import words.",
      status: 400,
    });
  });
});
