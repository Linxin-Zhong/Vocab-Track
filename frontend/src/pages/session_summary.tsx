import "./session_summary.css";

interface SessionSummaryProps {
  stats: {
    correct: number;
    total: number;
  };
  onReturnToDashboard: () => void;
}

export function SessionSummary({
  stats,
  onReturnToDashboard,
}: SessionSummaryProps) {
  const accuracy =
    stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="summary-page">
      <div className="summary-container">
        <div className="summary-header">
          <h1 className="summary-title">Session complete</h1>
          <p className="summary-subtitle">Great work today</p>
        </div>

        <div className="summary-card">
          <div className="summary-stats-grid">
            <div className="stat-item">
              <p className="stat-label">Accuracy</p>
              <p className="stat-value">{accuracy}%</p>
            </div>
            <div className="stat-item">
              <p className="stat-label">Words reviewed</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <button onClick={onReturnToDashboard} className="return-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
