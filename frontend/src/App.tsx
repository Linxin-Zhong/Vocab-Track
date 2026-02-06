import { useState } from 'react'
import './App.css'
import { StartingPage } from './pages/starting_page'
import { LoginPage } from './pages/login_page'
import { login, register} from './services/authService'

type Screen = 'landing' | 'signup' | 'dashboard'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing')

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen)
  }

  const handleLogin = async (email: string, password: string) => {
    const res = await login(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      // navigateTo('dashboard');
      console.log('login succeeded.')
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case 'AUTH':
          console.error('login failed: auth.');
          break;
        case 'NETWORK':
          console.error('login failed: network.');
          break;
        case 'RATE_LIMIT':
          console.error('login failed: rate.');
          break;
        default:
          console.error('login failed: unknown.');
      }
    }
  }

  const handleRegister = async (email: string, password: string) => {
    const res = await register(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      // navigateTo('dashboard');
      console.info('register succeeded.');
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case 'NETWORK':
          console.error('register failed: network.');
          break;
        case 'VALIDATION':
          console.error('register failed: validation.');
          break;
        case 'CONFLICT':
          console.error('register failed: conflict.');
          break;
        case 'RATE_LIMIT':
          console.error('register failed: rate.');
          break;
        default:
          console.error('register failed: unknown.');
      }
    }
  }

  return (
    <div>
      {currentScreen === 'landing' && (
        <StartingPage onGetStarted={() => navigateTo('signup')} />
      )}
      {currentScreen === 'signup' && (
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      )}
    </div>
  )
}
