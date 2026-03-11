import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

export type DictionaryKey = number;

export type DictionaryOption = {
  key: DictionaryKey;
  label: string;
};

export type ProgressSummary = {
  wordsStudied: number;
  daysActive: number;
  avgAccuracy: number;
};

export type DailyActivityPoint = {
  date: string;
  count: number;
};

export type DailyAccuracyPoint = {
  date: string;
  accuracy: number;
};

export type WordPerformanceRow = {
  wordId: number | string;
  wordText: string;
  accuracy: number;
  reviewCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  dictionaryKey: DictionaryKey;
};

export type ProgressPayload = {
  summary: ProgressSummary;
  dailyActivity: DailyActivityPoint[];
  dailyAccuracy: DailyAccuracyPoint[];
  wordPerformance: WordPerformanceRow[];
};

type PaginatedResponse<T> = {
  results?: T[];
};

type BackendBookListItem = {
  id?: number;
  book_id?: number;
  book_name?: string;
};

type BackendBookDetailResponse = {
  words_rw_count?: number;
  days_active?: number;
  avg_accuracy?: number;
  rw_trend?: Array<{
    date?: string;
    count?: number;
    accuracy?: number;
  }>;
  rw_words?: Array<{
    book_word_id?: number | string;
    word_text?: string;
    accuracy?: number;
    times_reviewed?: number;
    difficulty?: number | string;
  }>;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLast7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push(formatISODate(date));
  }

  return dates;
}

function normalizeListPayload<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    return raw as T[];
  }

  if (raw && typeof raw === "object") {
    const paginated = raw as PaginatedResponse<T>;
    if (Array.isArray(paginated.results)) {
      return paginated.results;
    }
  }

  return [];
}

function normalizeDifficulty(
  rawDifficulty: number | string | undefined,
): "Easy" | "Medium" | "Hard" | null {
  if (rawDifficulty === 1 || rawDifficulty === "Easy") return "Easy";
  if (rawDifficulty === 2 || rawDifficulty === "Medium") return "Medium";
  if (rawDifficulty === 3 || rawDifficulty === "Hard") return "Hard";
  return null;
}

function normalizeDictionaryOptions(raw: unknown): DictionaryOption[] {
  const rows = normalizeListPayload<BackendBookListItem>(raw);

  return rows
    .map((row) => {
      const key = row.id ?? row.book_id;
      const label = row.book_name;
      if (!isFiniteNumber(key) || typeof label !== "string" || label.length === 0) {
        return null;
      }
      return { key, label };
    })
    .filter((row): row is DictionaryOption => row !== null);
}

function normalizeProgressPayload(raw: unknown, dictionaryKey: DictionaryKey): ProgressPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid progress response");
  }

  const response = raw as BackendBookDetailResponse;

  const wordsStudied = response.words_rw_count;
  const daysActive = response.days_active;
  const avgAccuracy = response.avg_accuracy;

  if (
    !isFiniteNumber(wordsStudied) ||
    !isFiniteNumber(daysActive) ||
    !isFiniteNumber(avgAccuracy)
  ) {
    throw new Error("Progress summary is missing required fields");
  }

  const rawTrend = Array.isArray(response.rw_trend) ? response.rw_trend : [];
  const trendByDate = new Map<
    string,
    {
      count: number;
      accuracy: number | null;
    }
  >();

  for (const point of rawTrend) {
    if (typeof point.date !== "string" || !isFiniteNumber(point.count)) continue;
    trendByDate.set(point.date, {
      count: point.count,
      accuracy: isFiniteNumber(point.accuracy) ? clamp01(point.accuracy) : null,
    });
  }

  const last7Days = buildLast7Days();

  const dailyActivity: DailyActivityPoint[] = last7Days.map((date) => ({
    date,
    count: trendByDate.get(date)?.count ?? 0,
  }));

  const dailyAccuracy: DailyAccuracyPoint[] = last7Days
    .map((date) => {
      const point = trendByDate.get(date);
      if (!point || point.count <= 0 || point.accuracy === null) {
        return null;
      }
      return {
        date,
        accuracy: point.accuracy,
      };
    })
    .filter((point): point is DailyAccuracyPoint => point !== null);

  const rawWordPerformance = Array.isArray(response.rw_words) ? response.rw_words : [];

  const wordPerformance: WordPerformanceRow[] = rawWordPerformance
    .map((row) => {
      const difficulty = normalizeDifficulty(row.difficulty);
      if (
        (typeof row.book_word_id !== "number" && typeof row.book_word_id !== "string") ||
        typeof row.word_text !== "string" ||
        !isFiniteNumber(row.accuracy) ||
        !isFiniteNumber(row.times_reviewed) ||
        !difficulty
      ) {
        return null;
      }

      return {
        wordId: row.book_word_id,
        wordText: row.word_text,
        accuracy: clamp01(row.accuracy),
        reviewCount: row.times_reviewed,
        difficulty,
        dictionaryKey,
      };
    })
    .filter((row): row is WordPerformanceRow => row !== null);

  return {
    summary: {
      wordsStudied,
      daysActive,
      avgAccuracy: clamp01(avgAccuracy),
    },
    dailyActivity,
    dailyAccuracy,
    wordPerformance,
  };
}

export async function getProgressDictionaryOptions(): Promise<DictionaryOption[]> {
  const response = await apiRequest<unknown>(ENDPOINTS.BOOK.BASE);
  return normalizeDictionaryOptions(response);
}

export async function getProgressData(
  dictionaryKey: DictionaryKey,
): Promise<ProgressPayload> {
  const response = await apiRequest<unknown>(ENDPOINTS.BOOK.DETAIL(dictionaryKey));
  return normalizeProgressPayload(response, dictionaryKey);
}
