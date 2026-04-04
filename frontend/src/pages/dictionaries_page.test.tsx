import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DictionariesPage } from "./dictionaries_page";

describe("DictionariesPage", () => {
  const books = [
    { id: 1, book_name: "Core Words", is_default: true, language: "en-US" },
    { id: 2, book_name: "French A1", is_default: false, language: "en-US" },
  ];

  beforeEach(() => {
    vi.spyOn(window.speechSynthesis, "getVoices").mockReturnValue([
      { lang: "en-US" } as SpeechSynthesisVoice,
      { lang: "fr-FR" } as SpeechSynthesisVoice,
      { lang: "fr-FR" } as SpeechSynthesisVoice,
    ]);
    window.speechSynthesis.onvoiceschanged = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders available dictionaries and selected confirmation", () => {
    render(
      <DictionariesPage
        books={books}
        selectedBookId={2}
        handleChangeBook={vi.fn()}
        handleChangeBookLanguage={vi.fn()}
      />,
    );

    expect(screen.getByText("Dictionaries")).toBeInTheDocument();
    expect(screen.getByText("Core Words")).toBeInTheDocument();
    expect(screen.getByText(/active dictionary:/i)).toBeInTheDocument();
    expect(screen.getAllByText("French A1")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /selected/i })).toBeInTheDocument();
  });

  it("calls handleChangeBook once when select button is clicked", async () => {
    const user = userEvent.setup();
    const handleChangeBook = vi.fn();

    render(
      <DictionariesPage
        books={books}
        selectedBookId={null}
        handleChangeBook={handleChangeBook}
        handleChangeBookLanguage={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /select/i })[1]);

    expect(handleChangeBook).toHaveBeenCalledTimes(1);
    expect(handleChangeBook).toHaveBeenCalledWith(2);
  });

  it("updates the book language from the pronunciation dropdown", async () => {
    const user = userEvent.setup();
    const handleChangeBookLanguage = vi.fn();

    render(
      <DictionariesPage
        books={books}
        selectedBookId={1}
        handleChangeBook={vi.fn()}
        handleChangeBookLanguage={handleChangeBookLanguage}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "en-US" })[0]);
    await user.click(await screen.findByText("fr-FR"));
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    expect(handleChangeBookLanguage).toHaveBeenCalledWith(1, "fr-FR");
  });

  it("allows clearing the book language selection", async () => {
    const user = userEvent.setup();
    const handleChangeBookLanguage = vi.fn();

    render(
      <DictionariesPage
        books={books}
        selectedBookId={null}
        handleChangeBook={vi.fn()}
        handleChangeBookLanguage={handleChangeBookLanguage}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "en-US" })[0]);
    await user.click(await screen.findByText(/language not specified/i));
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    expect(handleChangeBookLanguage).toHaveBeenCalledWith(1, null);
    expect(screen.queryByText(/active dictionary:/i)).not.toBeInTheDocument();
  });
});
