import "./dashboard.css";
interface DashboardProps {
  wordsReviewedToday: number;
  onStartSession: () => void;
  onLogout?: () => void;
}

export function Dashboard({
  wordsReviewedToday,
  onStartSession,
  onLogout,
}: DashboardProps) {
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

          <button onClick={onStartSession} className="start-session-btn">
            Start Study Session
          </button>
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
