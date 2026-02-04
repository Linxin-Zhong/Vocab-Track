import { useState } from 'react'
import './App.css'
import { StartingPage } from './pages/starting_page'
import { LoginPage } from './pages/login_page'
import { login } from './services/login_service'

type Screen = 'landing' | 'signup'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      const user = await login(username, password) // call service
      // e.g., redirect to dashboard
    } catch (err) {
      alert("Invalid username or password")
    }
  }

  return (
    <div>
      {currentScreen === 'landing' && (
        <StartingPage onGetStarted={() => navigateTo('signup')} />
      )}
      {currentScreen === 'signup' && (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  )
}
