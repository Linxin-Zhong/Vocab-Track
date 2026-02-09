import '../pages/starting_page.css'

type StartingPageProps = {
  onGetStarted?: () => void
}

export function StartingPage({ onGetStarted }: StartingPageProps) {
  return (
     <div className="starting-root">
      <div className="starting-container">
        <div className="starting-text-group">
          <h1 className="starting-title">Vocab Track</h1>
          <p className="starting-subtitle">
            Build your vocabulary through focused, daily practice with flashcards
          </p>
        </div>

        <button
          onClick={onGetStarted}
          className="starting-button"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
