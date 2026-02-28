import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SessionSummary } from "./session_summary";

describe("SessionSummary", () => {
  it("renders the stats correctly", () => {
    const stats = { correct: 3, total: 4 };
    render(<SessionSummary stats={stats} onReturnToDashboard={() => {}} />);

    // Check accuracy: (3/4) * 100 = 75
    expect(screen.getByText("75%")).toBeInTheDocument();
    // Check total words reviewed
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("handles 0 total words gracefully", () => {
    const stats = { correct: 0, total: 0 };
    render(<SessionSummary stats={stats} onReturnToDashboard={() => {}} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("calls onReturnToDashboard when the button is clicked", async () => {
    const user = userEvent.setup();
    const onReturnToDashboard = vi.fn();
    const stats = { correct: 5, total: 10 };

    render(
      <SessionSummary
        stats={stats}
        onReturnToDashboard={onReturnToDashboard}
      />
    );

    const button = screen.getByRole("button", {
      name: /return to dashboard/i,
    });
    await user.click(button);

    expect(onReturnToDashboard).toHaveBeenCalledTimes(1);
  });

  it("rounds accuracy to the nearest integer", () => {
    // 1 out of 3 is 33.333...%
    const stats = { correct: 1, total: 3 };
    render(<SessionSummary stats={stats} onReturnToDashboard={() => {}} />);

    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});
