import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Dashboard } from "./dashboard";

describe("Dashboard", () => {
  it("renders the dashboard with the correct number of words reviewed today", () => {
    const wordsReviewedToday = 15;
    render(
      <Dashboard
        wordsReviewedToday={wordsReviewedToday}
        onStartSession={() => {}}
      />
    );

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Words reviewed today")).toBeInTheDocument();
  });

  it("calls onStartSession when 'Start Study Session' is clicked", async () => {
    const user = userEvent.setup();
    const onStartSession = vi.fn();
    render(
      <Dashboard wordsReviewedToday={0} onStartSession={onStartSession} />
    );

    const button = screen.getByRole("button", { name: /start study session/i });
    await user.click(button);

    expect(onStartSession).toHaveBeenCalledTimes(1);
  });

  it("renders log out button when onLogout prop is provided", () => {
    const onLogout = vi.fn();
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        onLogout={onLogout}
      />
    );

    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
  });

  it("does not render log out button when onLogout prop is not provided", () => {
    render(<Dashboard wordsReviewedToday={0} onStartSession={() => {}} />);

    expect(
      screen.queryByRole("button", { name: /log out/i })
    ).not.toBeInTheDocument();
  });

  it("calls onLogout when the 'Log out' button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        onLogout={onLogout}
      />
    );

    const button = screen.getByRole("button", { name: /log out/i });
    await user.click(button);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
