import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    books: [{ id: 1, book_name: "Core Words", is_default: false, language: "en-US" }],
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

  it("imports plain txt rows and uses the word as the fallback meaning", async () => {
    const user = userEvent.setup();
    mockImportWordsEntries.mockResolvedValueOnce({
      message: "Words added successfully.",
      created: [
        {
          book_word_id: 5,
          word_text: "bonjour",
          meaning: "bonjour",
          example: "",
          difficulty: 1,
        },
      ],
      failed: [],
    });

    renderImportPage();

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    await user.upload(
      input,
      makeFile("bonjour\nmerci", "words.txt", "text/plain"),
    );

    expect(
      await screen.findByText(/txt import uses one word per line/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /confirm import/i }));

    await waitFor(() =>
      expect(mockImportWordsEntries).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({
            word_text: "bonjour",
            meaning: "bonjour",
            example: "",
          }),
        ]),
      ),
    );
  });

  it("shows csv warnings for skipped rows and invalid difficulty", async () => {
    const user = userEvent.setup();
    renderImportPage();

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    const csv = [
      "word,definition,example,difficulty",
      "singlecolumn",
      ",missing word,,2",
      'quoted,"has, comma",example,9',
      "valid,definition,example,2",
    ].join("\n");

    await user.upload(input, makeFile(csv, "warnings.csv", "text/csv"));

    expect(await screen.findByText(/2 rows skipped/i)).toBeInTheDocument();
    expect(
      screen.getByText(/expected at least word and definition columns/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/word and definition cannot be empty/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/difficulty '9' is invalid\. defaulting to 1\./i),
    ).toBeInTheDocument();
    expect(screen.getByText("has, comma")).toBeInTheDocument();
  });

  it("shows an unsupported file type error", async () => {
    const { props } = renderImportPage();
    const input = screen.getByLabelText(/choose a csv or txt file to import/i);

    fireEvent.change(input, {
      target: {
        files: [makeFile("hello", "words.json", "application/json")],
      },
    });

    expect(
      await screen.findByText(/unsupported file type\. please upload a csv or txt file\./i),
    ).toBeInTheDocument();
    expect(props.onChangeBook).not.toHaveBeenCalled();
  });

  it("shows empty and invalid-file parsing errors", async () => {
    const user = userEvent.setup();
    renderImportPage();

    const input = screen.getByLabelText(/choose a csv or txt file to import/i);

    await user.upload(input, makeFile("", "empty.txt", "text/plain"));
    expect(await screen.findByText(/this file is empty\. add content and try again\./i)).toBeInTheDocument();

    await user.upload(
      input,
      makeFile("word,definition\n,\n", "invalid.csv", "text/csv"),
    );
    expect(
      await screen.findByText(/we couldn't find valid rows in this csv/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/drop your file here, or click to browse/i)).toBeInTheDocument();
  });

  it("auto-switches to new dictionary mode when no existing dictionaries are available", async () => {
    renderImportPage({
      books: [{ id: 1, book_name: "Default", is_default: true, language: "en-US" }],
      selectedBookId: null,
    });

    expect(await screen.findByText(/no existing dictionaries found\./i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /existing dictionary/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /create new dictionary/i })).toBeChecked();
  });

  it("shows destination validation and import success actions", async () => {
    const user = userEvent.setup();
    const onGoToDictionaries = vi.fn();
    const onStartStudySession = vi.fn();

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
      failed: [
        {
          row_number: 2,
          word_text: "salut",
          error: "duplicate",
        },
      ],
    });

    renderImportPage({ onGoToDictionaries, onStartStudySession });

    await user.click(screen.getByRole("radio", { name: /create new dictionary/i }));
    const input = screen.getByLabelText(/choose a csv or txt file to import/i);
    await user.upload(
      input,
      makeFile("word,definition\nbonjour,hello", "tiny.csv", "text/csv"),
    );

    await user.click(screen.getByRole("button", { name: /confirm import/i }));
    expect(await screen.findByText(/dictionary name is required\./i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/dictionary name/i), "French A1");
    await user.click(screen.getByRole("radio", { name: /existing dictionary/i }));
    await user.click(screen.getByRole("button", { name: /confirm import/i }));

    expect(await screen.findByText(/1 created/i)).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/i)).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.textContent === "1 created, 1 skipped in Core Words.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start study session/i }));
    expect(onStartStudySession).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /view dictionaries/i }));
    expect(onGoToDictionaries).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /import another file/i }));
    expect(screen.getByText(/drop your file here, or click to browse/i)).toBeInTheDocument();
  });
});
