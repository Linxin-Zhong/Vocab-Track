import '../pages/starting_page.css';
export function StartingPage() {
  return (
    <main className="starting-page-container">
        <h1 className="title-1 centered">
            Vocab Track
        </h1>
        <p className="subtitle-1 centered">
            Build your vocabulary through focused, daily practice with flashcards
        </p>
        <button onClick={() => console.log("Get Started clicked") } className="start-button centered">
          Get Started
        </button>
    </main>
  );
}