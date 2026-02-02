import '../pages/starting_page.css'

type StartingPageProps = {
  onGetStarted?: () => void
}

export function StartingPage({ onGetStarted }: StartingPageProps) {
  return (
    <main className="starting-page-container">
      <h1 className="title-1 centered">
        Vocab Track
      </h1>
      <p className="subtitle-1 centered">
        Build your vocabulary through focused, daily practice with flashcards
      </p>
      <button
        onClick={onGetStarted ?? (() => console.log('Get Started clicked'))}
        className="start-button centered"
        type="button"
      >
        Get Started
      </button>
    </main>
  )
}
