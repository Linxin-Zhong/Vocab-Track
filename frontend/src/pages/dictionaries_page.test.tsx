import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DictionariesPage } from "./dictionaries_page";

describe("DictionariesPage", () => {
  const books = [
    { id: 1, book_name: "Core Words", is_default: true },
    { id: 2, book_name: "French A1", is_default: false },
  ];

  it("renders available dictionaries and selected confirmation", () => {
    render(
      <DictionariesPage
        books={books}
        selectedBookId={2}
        handleChangeBook={vi.fn()}
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
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /select/i })[1]);

    expect(handleChangeBook).toHaveBeenCalledTimes(1);
    expect(handleChangeBook).toHaveBeenCalledWith(2);
  });
});
