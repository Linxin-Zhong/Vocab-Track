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

  it("disables start button while session request is in-flight", () => {
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        isStartingSession
      />
    );

    const button = screen.getByRole("button", { name: /starting/i });
    expect(button).toBeDisabled();
  });

  it("renders session start error when provided", () => {
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        startSessionError="Failed to start study session."
      />
    );

    expect(
      screen.getByText(/failed to start study session/i),
    ).toBeInTheDocument();
  });

  it("renders view progress button when onViewProgress prop is provided", () => {
    const onViewProgress = vi.fn();
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        onViewProgress={onViewProgress}
      />
    );

    expect(
      screen.getByRole("button", { name: /view progress/i }),
    ).toBeInTheDocument();
  });

  it("does not render view progress button when onViewProgress prop is not provided", () => {
    render(<Dashboard wordsReviewedToday={0} onStartSession={() => {}} />);

    expect(
      screen.queryByRole("button", { name: /view progress/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onViewProgress when the 'View Progress' button is clicked", async () => {
    const user = userEvent.setup();
    const onViewProgress = vi.fn();
    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        onViewProgress={onViewProgress}
      />
    );

    const button = screen.getByRole("button", { name: /view progress/i });
    await user.click(button);

    expect(onViewProgress).toHaveBeenCalledTimes(1);
  });

  it("renders dictionaries and import buttons when handlers are provided", async () => {
    const user = userEvent.setup();
    const onViewDictionaries = vi.fn();
    const onImportWords = vi.fn();

    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => {}}
        onViewDictionaries={onViewDictionaries}
        onImportWords={onImportWords}
      />,
    );

    await user.click(screen.getByRole("button", { name: /dictionaries/i }));
    await user.click(screen.getByRole("button", { name: /import words/i }));

    expect(onViewDictionaries).toHaveBeenCalledTimes(1);
    expect(onImportWords).toHaveBeenCalledTimes(1);
  });

  it("catches rejected start-session promises to avoid unhandled errors", async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Dashboard
        wordsReviewedToday={0}
        onStartSession={() => Promise.reject(new Error("boom"))}
      />,
    );

    await user.click(screen.getByRole("button", { name: /start study session/i }));

    expect(errorSpy).toHaveBeenCalled();
  });
});
