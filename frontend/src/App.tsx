import { useState } from 'react'
import './App.css'
import { StartingPage } from './pages/starting_page'
import { LoginPage } from './pages/login_page'

type Screen = 'landing' | 'signup'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  return (
    <div>
      {currentScreen === 'landing' && (
        <StartingPage onGetStarted={() => navigateTo('signup')} />
      )}
      {currentScreen === 'signup' && (
        <LoginPage />
      )}
    </div>
  )
}
