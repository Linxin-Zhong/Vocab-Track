import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressPage } from "./progress_page";
import type React from "react";
import {
  getProgressData,
  getProgressDictionaryOptions,
} from "../services/progressService";

vi.mock("../services/progressService", () => ({
  getProgressData: vi.fn(),
  getProgressDictionaryOptions: vi.fn(),
}));

vi.mock("recharts", () => {
  const MockComponent = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: MockComponent,
    BarChart: MockComponent,
    Bar: MockComponent,
    CartesianGrid: MockComponent,
    Tooltip: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    LineChart: MockComponent,
    Line: MockComponent,
  };
});

const mockGetProgressData = vi.mocked(getProgressData);
const mockGetProgressDictionaryOptions = vi.mocked(getProgressDictionaryOptions);

describe("ProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading then renders empty dictionaries state", async () => {
    mockGetProgressDictionaryOptions.mockResolvedValueOnce([]);

    render(<ProgressPage studyingDictionary={null}/>);

    expect(screen.getByText(/loading progress/i)).toBeInTheDocument();
    expect(await screen.findByText(/no dictionaries available yet/i)).toBeInTheDocument();
    expect(mockGetProgressData).not.toHaveBeenCalled();
  });

  it("shows error state when dictionary options fail", async () => {
    mockGetProgressDictionaryOptions.mockRejectedValueOnce(new Error("boom"));

    render(<ProgressPage studyingDictionary={null}/>);

    expect(
      await screen.findByText(/unable to load progress data right now/i),
    ).toBeInTheDocument();
  });

  it("renders summary, empty chart states, and word rows", async () => {
    mockGetProgressDictionaryOptions.mockResolvedValueOnce([
      { key: 1, label: "Core Words" },
    ]);
    mockGetProgressData.mockResolvedValueOnce({
      summary: { wordsStudied: 12, daysActive: 4, avgAccuracy: 0.65 },
      dailyActivity: [{ date: "2026-03-10", count: 0 }],
      dailyAccuracy: [],
      wordPerformance: [
        {
          wordId: 10,
          wordText: "abate",
          accuracy: 0.75,
          reviewCount: 4,
          difficulty: "Medium",
          dictionaryKey: 1,
        },
      ],
    });

    render(<ProgressPage studyingDictionary={1}/>);

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("Days active")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no accuracy data yet/i)).toBeInTheDocument();
    expect(screen.getByText("abate")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("switches dictionaries and calls onSelectWord for table rows", async () => {
    const user = userEvent.setup();
    const onSelectWord = vi.fn();

    mockGetProgressDictionaryOptions.mockResolvedValueOnce([
      { key: 1, label: "Core Words" },
      { key: 2, label: "French A1" },
    ]);
    mockGetProgressData
      .mockResolvedValueOnce({
        summary: { wordsStudied: 2, daysActive: 1, avgAccuracy: 0.5 },
        dailyActivity: [{ date: "2026-03-10", count: 1 }],
        dailyAccuracy: [{ date: "2026-03-10", accuracy: 0.5 }],
        wordPerformance: [
          {
            wordId: 1,
            wordText: "abate",
            accuracy: 0.5,
            reviewCount: 2,
            difficulty: "Easy",
            dictionaryKey: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        summary: { wordsStudied: 3, daysActive: 2, avgAccuracy: 0.9 },
        dailyActivity: [{ date: "2026-03-11", count: 2 }],
        dailyAccuracy: [{ date: "2026-03-11", accuracy: 0.9 }],
        wordPerformance: [
          {
            wordId: 2,
            wordText: "bonjour",
            accuracy: 0.9,
            reviewCount: 3,
            difficulty: "Hard",
            dictionaryKey: 2,
          },
        ],
      });

    render(<ProgressPage studyingDictionary={1} onSelectWord={onSelectWord} />);

    expect(await screen.findByText("abate")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "French A1" }));

    await waitFor(() =>
      expect(mockGetProgressData).toHaveBeenLastCalledWith(2),
    );
    expect(await screen.findByText("bonjour")).toBeInTheDocument();

    await user.click(screen.getByText("bonjour"));
    expect(onSelectWord).toHaveBeenCalledWith(
      expect.objectContaining({ wordText: "bonjour", dictionaryKey: 2 }),
    );
  });
});
