import { apiRequest } from "./apiClient";

export type DictionaryKey = "general" | "academic" | "toefl" | "custom";

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

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_PROGRESS_DATA === "true";

type BackendProgressResponse = {
  summary?: {
    wordsStudied?: number;
    words_studied?: number;
    daysActive?: number;
    days_active?: number;
    avgAccuracy?: number;
    avg_accuracy?: number;
  };
  dailyActivity?: Array<{
    date?: string;
    day?: string;
    count?: number;
    words?: number;
  }>;
  daily_activity?: Array<{
    date?: string;
    day?: string;
    count?: number;
    words?: number;
  }>;
  dailyAccuracy?: Array<{
    date?: string;
    day?: string;
    accuracy?: number;
  }>;
  daily_accuracy?: Array<{
    date?: string;
    day?: string;
    accuracy?: number;
  }>;
  wordPerformance?: Array<{
    wordId?: number | string;
    word_id?: number | string;
    wordText?: string;
    word_text?: string;
    accuracy?: number;
    reviewCount?: number;
    review_count?: number;
    difficulty?: "Easy" | "Medium" | "Hard";
    dictionaryKey?: DictionaryKey;
    dictionary_key?: DictionaryKey;
  }>;
  word_performance?: Array<{
    wordId?: number | string;
    word_id?: number | string;
    wordText?: string;
    word_text?: string;
    accuracy?: number;
    reviewCount?: number;
    review_count?: number;
    difficulty?: "Easy" | "Medium" | "Hard";
    dictionaryKey?: DictionaryKey;
    dictionary_key?: DictionaryKey;
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

function buildLast14Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 13; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    dates.push(formatISODate(d));
  }
  return dates;
}

function createMockPayload(
  dictionaryKey: DictionaryKey,
  counts: number[],
  accuraciesByDayIndex: Record<number, number>,
  words: Array<{
    wordId: number | string;
    wordText: string;
    accuracy: number;
    reviewCount: number;
    difficulty: "Easy" | "Medium" | "Hard";
  }>,
): ProgressPayload {
  const dates = buildLast14Days();
  const safeCounts = dates.map((_, index) => counts[index] ?? 0);

  const dailyActivity: DailyActivityPoint[] = dates.map((date, index) => ({
    date,
    count: safeCounts[index],
  }));

  const dailyAccuracy: DailyAccuracyPoint[] = dates
    .map((date, index) => {
      const count = safeCounts[index];
      const accuracy = accuraciesByDayIndex[index];
      if (count <= 0 || !isFiniteNumber(accuracy)) {
        return null;
      }
      return {
        date,
        accuracy: clamp01(accuracy),
      };
    })
    .filter((item): item is DailyAccuracyPoint => item !== null);

  const wordsStudied = dailyActivity.reduce((sum, item) => sum + item.count, 0);
  const daysActive = dailyActivity.reduce(
    (sum, item) => sum + (item.count > 0 ? 1 : 0),
    0,
  );
  const avgAccuracy =
    dailyAccuracy.length > 0
      ? dailyAccuracy.reduce((sum, item) => sum + item.accuracy, 0) /
        dailyAccuracy.length
      : 0;

  const wordPerformance: WordPerformanceRow[] = words.map((item) => ({
    ...item,
    dictionaryKey,
    accuracy: clamp01(item.accuracy),
  }));

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

const MOCK_DATA: Record<DictionaryKey, ProgressPayload> = {
  general: createMockPayload(
    "general",
    [2, 0, 3, 5, 0, 6, 4, 2, 5, 4, 0, 7, 5, 3],
    {
      0: 0.7,
      2: 0.76,
      3: 0.78,
      5: 0.75,
      6: 0.71,
      7: 0.76,
      8: 0.81,
      9: 0.81,
      11: 0.84,
      12: 0.86,
      13: 0.88,
    },
    [
      {
        wordId: 1101,
        wordText: "analyze",
        accuracy: 0.92,
        reviewCount: 13,
        difficulty: "Easy",
      },
      {
        wordId: 1102,
        wordText: "elaborate",
        accuracy: 0.78,
        reviewCount: 9,
        difficulty: "Medium",
      },
      {
        wordId: 1103,
        wordText: "derive",
        accuracy: 0.62,
        reviewCount: 8,
        difficulty: "Hard",
      },
      {
        wordId: 1104,
        wordText: "sustain",
        accuracy: 0.84,
        reviewCount: 10,
        difficulty: "Easy",
      },
    ],
  ),
  academic: createMockPayload(
    "academic",
    [1, 2, 0, 3, 4, 0, 2, 3, 0, 4, 5, 2, 0, 3],
    {
      0: 0.74,
      1: 0.79,
      3: 0.76,
      4: 0.8,
      6: 0.75,
      7: 0.77,
      9: 0.82,
      10: 0.83,
      11: 0.8,
      13: 0.84,
    },
    [
      {
        wordId: 2201,
        wordText: "coherent",
        accuracy: 0.88,
        reviewCount: 12,
        difficulty: "Easy",
      },
      {
        wordId: 2202,
        wordText: "synthesize",
        accuracy: 0.72,
        reviewCount: 11,
        difficulty: "Medium",
      },
      {
        wordId: 2203,
        wordText: "methodology",
        accuracy: 0.63,
        reviewCount: 9,
        difficulty: "Hard",
      },
      {
        wordId: 2204,
        wordText: "inference",
        accuracy: 0.76,
        reviewCount: 10,
        difficulty: "Medium",
      },
    ],
  ),
  toefl: createMockPayload(
    "toefl",
    [0, 3, 2, 4, 0, 3, 2, 4, 3, 0, 2, 5, 4, 3],
    {
      1: 0.69,
      2: 0.71,
      3: 0.75,
      5: 0.74,
      6: 0.73,
      7: 0.77,
      8: 0.78,
      10: 0.76,
      11: 0.81,
      12: 0.83,
      13: 0.84,
    },
    [
      {
        wordId: 3301,
        wordText: "constrain",
        accuracy: 0.7,
        reviewCount: 10,
        difficulty: "Medium",
      },
      {
        wordId: 3302,
        wordText: "fluctuate",
        accuracy: 0.66,
        reviewCount: 11,
        difficulty: "Hard",
      },
      {
        wordId: 3303,
        wordText: "precise",
        accuracy: 0.87,
        reviewCount: 8,
        difficulty: "Easy",
      },
      {
        wordId: 3304,
        wordText: "inevitable",
        accuracy: 0.79,
        reviewCount: 9,
        difficulty: "Medium",
      },
    ],
  ),
  custom: createMockPayload(
    "custom",
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    {},
    [],
  ),
};

function normalizeSummary(
  rawSummary: BackendProgressResponse["summary"],
): ProgressSummary | null {
  if (!rawSummary) return null;
  const wordsStudied = rawSummary.wordsStudied ?? rawSummary.words_studied;
  const daysActive = rawSummary.daysActive ?? rawSummary.days_active;
  const avgAccuracy = rawSummary.avgAccuracy ?? rawSummary.avg_accuracy;
  if (
    !isFiniteNumber(wordsStudied) ||
    !isFiniteNumber(daysActive) ||
    !isFiniteNumber(avgAccuracy)
  ) {
    return null;
  }
  return {
    wordsStudied,
    daysActive,
    avgAccuracy: clamp01(avgAccuracy),
  };
}

function normalizeDailyActivity(
  rawActivity:
    | BackendProgressResponse["dailyActivity"]
    | BackendProgressResponse["daily_activity"],
): DailyActivityPoint[] | null {
  if (!Array.isArray(rawActivity)) return null;
  const normalized = rawActivity
    .map((item) => {
      const date = item.date ?? item.day;
      const count = item.count ?? item.words;
      if (typeof date !== "string" || !isFiniteNumber(count)) {
        return null;
      }
      return { date, count };
    })
    .filter((item): item is DailyActivityPoint => item !== null);
  return normalized.length > 0 ? normalized : [];
}

function normalizeDailyAccuracy(
  rawAccuracy:
    | BackendProgressResponse["dailyAccuracy"]
    | BackendProgressResponse["daily_accuracy"],
): DailyAccuracyPoint[] | null {
  if (!Array.isArray(rawAccuracy)) return null;
  const normalized = rawAccuracy
    .map((item) => {
      const date = item.date ?? item.day;
      if (typeof date !== "string" || !isFiniteNumber(item.accuracy)) {
        return null;
      }
      return {
        date,
        accuracy: clamp01(item.accuracy),
      };
    })
    .filter((item): item is DailyAccuracyPoint => item !== null);
  return normalized.length > 0 ? normalized : [];
}

function normalizeWordPerformance(
  rawRows:
    | BackendProgressResponse["wordPerformance"]
    | BackendProgressResponse["word_performance"],
  dictionaryKey: DictionaryKey,
): WordPerformanceRow[] | null {
  if (!Array.isArray(rawRows)) return null;
  const normalized = rawRows
    .map((item) => {
      const wordId = item.wordId ?? item.word_id;
      const wordText = item.wordText ?? item.word_text;
      const reviewCount = item.reviewCount ?? item.review_count;
      const difficulty = item.difficulty;
      const rowDictionary = item.dictionaryKey ?? item.dictionary_key;
      if (
        (typeof wordId !== "number" && typeof wordId !== "string") ||
        typeof wordText !== "string" ||
        !isFiniteNumber(item.accuracy) ||
        !isFiniteNumber(reviewCount) ||
        (difficulty !== "Easy" && difficulty !== "Medium" && difficulty !== "Hard")
      ) {
        return null;
      }
      return {
        wordId,
        wordText,
        accuracy: clamp01(item.accuracy),
        reviewCount,
        difficulty,
        dictionaryKey: rowDictionary ?? dictionaryKey,
      };
    })
    .filter((item): item is WordPerformanceRow => item !== null);
  return normalized.length > 0 ? normalized : [];
}

function normalizeBackendPayload(
  raw: unknown,
  dictionaryKey: DictionaryKey,
): ProgressPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid progress response");
  }
  const typedRaw = raw as BackendProgressResponse;
  const summary = normalizeSummary(typedRaw.summary);
  const dailyActivity = normalizeDailyActivity(
    typedRaw.dailyActivity ?? typedRaw.daily_activity,
  );
  const dailyAccuracy = normalizeDailyAccuracy(
    typedRaw.dailyAccuracy ?? typedRaw.daily_accuracy,
  );
  const wordPerformance = normalizeWordPerformance(
    typedRaw.wordPerformance ?? typedRaw.word_performance,
    dictionaryKey,
  );
  if (!summary || dailyActivity === null || dailyAccuracy === null) {
    throw new Error("Progress response missing required fields");
  }
  return {
    summary,
    dailyActivity,
    dailyAccuracy,
    wordPerformance: wordPerformance ?? [],
  };
}

async function fetchBackendProgress(
  dictionaryKey: DictionaryKey,
): Promise<ProgressPayload> {
  const endpoint = `/review/progress/?dictionary=${dictionaryKey}`;
  const response = await apiRequest<unknown>(endpoint);
  return normalizeBackendPayload(response, dictionaryKey);
}

export async function getProgressData(
  dictionaryKey: DictionaryKey,
): Promise<ProgressPayload> {
  if (USE_MOCK_DATA) {
    return MOCK_DATA[dictionaryKey];
  }

  try {
    return await fetchBackendProgress(dictionaryKey);
  } catch {
    return MOCK_DATA[dictionaryKey];
  }
}
