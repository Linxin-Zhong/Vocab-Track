interface DashboardProps {
  wordsReviewedToday: number;
  onStartSession: () => void;
  onLogout?: () => void;
}

export function Dashboard({ wordsReviewedToday, onStartSession, onLogout }: DashboardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl text-neutral-900">
            Welcome back
          </h1>
          <p className="text-neutral-600">
            Ready to continue your learning?
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-neutral-200 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-sm text-neutral-600">Words reviewed today</p>
            <p className="text-4xl text-neutral-900">{wordsReviewedToday}</p>
          </div>

          <button
            onClick={onStartSession}
            className="w-full px-6 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors text-lg"
          >
            Start Study Session
          </button>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full px-6 py-3 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
