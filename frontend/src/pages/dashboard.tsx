import "./dashboard.css";
interface DashboardProps {
  wordsReviewedToday: number;
  onStartSession: () => Promise<void> | void;
  onLogout?: () => void;
  isStartingSession?: boolean;
  startSessionError?: string | null;
}

export function Dashboard({
  wordsReviewedToday,
  onStartSession,
  onLogout,
  isStartingSession = false,
  startSessionError = null,
}: DashboardProps) {
  const handleStartSessionClick = () => {
    void Promise.resolve()
      .then(onStartSession)
      .catch((error) => {
        // Parent usually handles errors via state, but keep this catch to avoid unhandled rejections.
        console.error("Start session failed:", error);
      });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">Ready to continue your learning?</p>
        </div>

        {/* Card */}
        <div className="stats-card">
          <div className="stats-text">
            <p className="stats-label">Words reviewed today</p>
            <p className="stats-value">{wordsReviewedToday}</p>
          </div>

          <button
            onClick={handleStartSessionClick}
            className="start-session-btn"
            disabled={isStartingSession}
          >
            {isStartingSession ? "Starting..." : "Start Study Session"}
          </button>
          {startSessionError ? (
            <p className="dashboard-error">{startSessionError}</p>
          ) : null}
        </div>

        {/* Logout */}
        {onLogout && (
          <button onClick={onLogout} className="logout-btn">
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
