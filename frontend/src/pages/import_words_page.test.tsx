import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImportWordsPage } from "./import_words_page";
import { importWordsEntries } from "../services/importService";

vi.mock("../services/importService", () => ({
  importWordsEntries: vi.fn(),
}));

const mockImportWordsEntries = vi.mocked(importWordsEntries);

function makeFile(content: string, name: string, type: string) {
  const file = new File([content], name, { type });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

function renderImportPage(overrides?: Partial<ComponentProps<typeof ImportWordsPage>>) {
  const props: ComponentProps<typeof ImportWordsPage> = {
    books: [{ id: 1, book_name: "Core Words", is_default: false }],
    selectedBookId: 1,
    onChangeBook: vi.fn(),
    onCreateBook: vi.fn().mockResolvedValue({
      id: 99,
      book_name: "Created Deck",
      is_default: false,
    }),
    onGoToDictionaries: vi.fn(),
    onStartStudySession: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<ImportWordsPage {...props} />),
    props,
  };
}

describe("ImportWordsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows destination options side-by-side and toggles conditional fields", async () => {
    const user = userEvent.setup();
    renderImportPage();

    expect(
      screen.getByRole("heading", { name: /import destination/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /existing dictionary/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /create new dictionary/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^dictionary$/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /create new dictionary/i }));

    expect(screen.getByLabelText(/dictionary name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^dictionary$/i)).toBeDisabled();
  });

  it("limits preview rows to 5", async () => {
    const user = userEvent.setup();
    renderImportPage();

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    const csv = [
      "word,definition,example",
      "one,def1,ex1",
      "two,def2,ex2",
      "three,def3,ex3",
      "four,def4,ex4",
      "five,def5,ex5",
      "six,def6,ex6",
      "seven,def7,ex7",
    ].join("\n");

    await user.upload(input, makeFile(csv, "words.csv", "text/csv"));

    expect(await screen.findByText(/showing 5 of 7 rows before import/i)).toBeInTheDocument();
  });

  it("auto-detects comma-delimited txt and sends parsed payload with difficulty", async () => {
    const user = userEvent.setup();
    mockImportWordsEntries.mockResolvedValueOnce({
      message: "Words added successfully.",
      created: [{
        book_word_id: 1,
        word_text: "livre",
        meaning: "book",
        example: "I read every night",
        difficulty: 2,
      }],
      failed: [],
    });

    renderImportPage();

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    const txt = [
      "livre,book,I read every night,2",
      "ordinateur,computer,I use a computer for work,1",
    ].join("\n");

    await user.upload(input, makeFile(txt, "words.txt", "text/plain"));

    expect(
      await screen.findByText(/parsed as csv format automatically/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => expect(mockImportWordsEntries).toHaveBeenCalledTimes(1));
    expect(mockImportWordsEntries).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          word_text: "livre",
          meaning: "book",
          example: "I read every night",
          difficulty: 2,
        }),
      ]),
    );
  });

  it("creates a new dictionary before import when new destination is selected", async () => {
    const user = userEvent.setup();
    const onCreateBook = vi.fn().mockResolvedValue({
      id: 42,
      book_name: "French A1",
      is_default: false,
    });

    mockImportWordsEntries.mockResolvedValueOnce({
      message: "Words added successfully.",
      created: [
        {
          book_word_id: 3,
          word_text: "bonjour",
          meaning: "hello",
          example: "",
          difficulty: 1,
        },
      ],
      failed: [],
    });

    renderImportPage({ onCreateBook });

    await user.click(screen.getByRole("radio", { name: /create new dictionary/i }));
    await user.type(screen.getByLabelText(/dictionary name/i), "French A1");

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    await user.upload(
      input,
      makeFile("word,definition,example\nbonjour,hello,", "tiny.csv", "text/csv"),
    );

    await user.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() => expect(onCreateBook).toHaveBeenCalledWith("French A1"));
    await waitFor(() => expect(mockImportWordsEntries).toHaveBeenCalledWith(42, expect.any(Array)));
    expect(await screen.findByText(/in french a1\./i)).toBeInTheDocument();
  });
});
