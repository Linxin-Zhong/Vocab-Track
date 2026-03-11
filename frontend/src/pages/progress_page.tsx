import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getProgressData,
  getProgressDictionaryOptions,
  type DailyAccuracyPoint,
  type DailyActivityPoint,
  type DictionaryOption,
  type DictionaryKey,
  type ProgressPayload,
  type WordPerformanceRow,
} from "../services/progressService";
import "./progress_page.css";

type ProgressPageProps = {
  onSelectWord?: (word: WordPerformanceRow) => void;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function parseISODate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateLabel(dateString: string): string {
  return DATE_FORMATTER.format(parseISODate(dateString));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type ActivityTooltipPayload = {
  date: string;
  count: number;
};

type AccuracyTooltipPayload = {
  date: string;
  accuracy: number;
};

type ChartTooltipProps<TPayload> = {
  active?: boolean;
  payload?: Array<{ payload: TPayload }>;
};

function ActivityTooltip({
  active,
  payload,
}: ChartTooltipProps<ActivityTooltipPayload>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload as ActivityTooltipPayload;

  return (
    <div className="progress-chart-tooltip">
      <p className="progress-chart-tooltip-title">{formatDateLabel(point.date)}</p>
      <p className="progress-chart-tooltip-value">Words : {point.count}</p>
    </div>
  );
}

function AccuracyTooltip({
  active,
  payload,
}: ChartTooltipProps<AccuracyTooltipPayload>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload as AccuracyTooltipPayload;

  return (
    <div className="progress-chart-tooltip">
      <p className="progress-chart-tooltip-title">{formatDateLabel(point.date)}</p>
      <p className="progress-chart-tooltip-value">
        Accuracy : {formatPercent(point.accuracy)}
      </p>
    </div>
  );
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="progress-empty-chart">
      <p>{label}</p>
    </div>
  );
}

export function ProgressPage({ onSelectWord }: ProgressPageProps) {
  const [dictionaryOptions, setDictionaryOptions] = useState<DictionaryOption[]>([]);
  const [selectedDictionary, setSelectedDictionary] = useState<DictionaryKey | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressPayload | null>(null);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setErrorMessage(null);

    void getProgressDictionaryOptions()
      .then((options) => {
        if (isCancelled) return;
        setDictionaryOptions(options);
        setSelectedDictionary((current) => {
          if (current !== null && options.some((option) => option.key === current)) {
            return current;
          }
          return options[0]?.key ?? null;
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setErrorMessage("Unable to load progress data right now.");
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedDictionary === null) return;

    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    void getProgressData(selectedDictionary)
      .then((data) => {
        if (isCancelled) return;
        setProgressData(data);
      })
      .catch(() => {
        if (isCancelled) return;
        setErrorMessage("Unable to load progress data right now.");
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDictionary]);

  const summary = progressData?.summary;
  const dailyActivity = progressData?.dailyActivity ?? [];
  const dailyAccuracy = useMemo<DailyAccuracyPoint[]>(
    () =>
      (progressData?.dailyAccuracy ?? []).filter(
        (point) => Number.isFinite(point.accuracy),
      ),
    [progressData],
  );
  const wordPerformance = progressData?.wordPerformance ?? [];
  const selectedDictionaryLabel =
    dictionaryOptions.find((option) => option.key === selectedDictionary)?.label ??
    "";

  const hasActivity = dailyActivity.some((point: DailyActivityPoint) => point.count > 0);
  const hasAccuracy = dailyAccuracy.length > 0;

  return (
    <div className="progress-page">
      <div className="progress-container">
        <header className="progress-header">
          <h1 className="progress-title">Progress</h1>
          <p className="progress-subtitle">Track your daily vocabulary learning</p>
        </header>

        <div className="progress-pill-row" role="tablist" aria-label="Dictionary filter">
          {dictionaryOptions.map((option) => {
            const isActive = selectedDictionary === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`progress-pill ${isActive ? "is-active" : ""}`}
                onClick={() => setSelectedDictionary(option.key)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="progress-loading-card">
            <p>Loading progress...</p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="progress-error-card">
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && dictionaryOptions.length === 0 ? (
          <div className="progress-error-card">
            <p>No dictionaries available yet.</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && summary ? (
          <>
            <section className="progress-stats-grid">
              <article className="progress-stat-card">
                <p className="progress-stat-label">Words studied</p>
                <p className="progress-stat-value">{summary.wordsStudied}</p>
              </article>
              <article className="progress-stat-card">
                <p className="progress-stat-label">Days active</p>
                <p className="progress-stat-value">{summary.daysActive}</p>
              </article>
              <article className="progress-stat-card">
                <p className="progress-stat-label">Average accuracy</p>
                <p className="progress-stat-value">{formatPercent(summary.avgAccuracy)}</p>
              </article>
            </section>

            <section className="progress-chart-grid">
              <article className="progress-chart-card">
                <header className="progress-chart-header">
                  <h2 className="progress-chart-title">Daily Study Activity</h2>
                  <p className="progress-chart-subtitle">
                    Words reviewed per day — last 7 days
                  </p>
                </header>
                {hasActivity ? (
                  <div className="progress-chart-wrap">
                    <ResponsiveContainer width="100%" height={232}>
                      <BarChart
                        data={dailyActivity}
                        margin={{ top: 14, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#ebebed" strokeDasharray="3 6" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={14}
                          minTickGap={20}
                          tickFormatter={formatDateLabel}
                          tick={{ fill: "#a2a3a7", fontSize: 16, fontWeight: 400 }}
                        />
                        <YAxis hide domain={[0, "dataMax + 1"]} />
                        <Tooltip
                          cursor={{ fill: "rgba(23, 23, 26, 0.04)" }}
                          content={<ActivityTooltip />}
                          wrapperStyle={{ outline: "none" }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#4a4b50"
                          maxBarSize={24}
                          radius={[7, 7, 0, 0]}
                          activeBar={{ fill: "#4a4b50" }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChartState label="No activity yet" />
                )}
              </article>

              <article className="progress-chart-card">
                <header className="progress-chart-header">
                  <h2 className="progress-chart-title">Daily Accuracy</h2>
                  <p className="progress-chart-subtitle">
                    Accuracy on study days — last 7 days
                  </p>
                </header>
                {hasAccuracy ? (
                  <div className="progress-chart-wrap">
                    <ResponsiveContainer width="100%" height={232}>
                      <LineChart
                        data={dailyAccuracy}
                        margin={{ top: 14, right: 8, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#ebebed" strokeDasharray="3 6" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={14}
                          minTickGap={20}
                          tickFormatter={formatDateLabel}
                          tick={{ fill: "#a2a3a7", fontSize: 16, fontWeight: 400 }}
                        />
                        <YAxis hide domain={[0, 1]} />
                        <Tooltip
                          cursor={{ stroke: "#d8d8d8", strokeWidth: 1 }}
                          content={<AccuracyTooltip />}
                          wrapperStyle={{ outline: "none" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          stroke="#4a4b50"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#4a4b50",
                            stroke: "#4a4b50",
                            strokeWidth: 0,
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#4a4b50",
                            stroke: "#ffffff",
                            strokeWidth: 3,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChartState label="No accuracy data yet" />
                )}
              </article>
            </section>

            <section className="progress-table-card">
              <header className="progress-table-header">
                <div>
                  <h2 className="progress-table-title">Word Performance</h2>
                  <p className="progress-table-subtitle">
                    {selectedDictionaryLabel} · Click a word to see detailed stats
                  </p>
                </div>
                <p className="progress-table-count">{wordPerformance.length} words</p>
              </header>
              {wordPerformance.length > 0 ? (
                <div className="progress-table-scroll">
                  <table className="progress-table">
                    <thead>
                      <tr>
                        <th>Word</th>
                        <th>Accuracy</th>
                        <th>Times Reviewed</th>
                        <th>Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wordPerformance.map((row) => (
                        <tr
                          key={String(row.wordId)}
                          className={onSelectWord ? "is-clickable" : ""}
                          onClick={
                            onSelectWord
                              ? () => {
                                  onSelectWord(row);
                                }
                              : undefined
                          }
                        >
                          <td>{row.wordText}</td>
                          <td>{formatPercent(row.accuracy)}</td>
                          <td>{row.reviewCount}</td>
                          <td>
                            <span
                              className={`difficulty-pill difficulty-${row.difficulty.toLowerCase()}`}
                            >
                              {row.difficulty}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="progress-table-empty">No words reviewed yet</p>
              )}
            </section>

            <section className="progress-info-card" aria-label="How review is prioritized">
              <h3 className="progress-info-title">How Vocab Track Prioritizes Words</h3>
              <p className="progress-info-line">
                Words you answer <strong>incorrectly</strong> appear more often in future
                sessions, giving you more practice where you need it.
              </p>
              <p className="progress-info-line">
                Words you answer <strong>correctly</strong> several times appear less often,
                so your review time focuses on new and challenging words.
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
