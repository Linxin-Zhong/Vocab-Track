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
      // TODO: set up user
      // TODO: implement dashboard UI
      // navigateTo('dashboard');
      console.log('login succeeded.')
    } else {
      switch (res.errorType) {
        case 'AUTH':
          // TODO: display auth err msg
          console.error('login failed: auth.');
          break;
        case 'NETWORK':
          // TODO: display network err msg
          console.error('login failed: network.');
          break;
        case 'RATE_LIMIT':
          // TODO: display rate err msg
          console.error('login failed: rate.');
          break;
        default:
          // TODO: display unknown err msg
          console.error('login failed: unknown.');
      }
    }
  }

  const handleRegister = async (email: string, password: string) => {
    const res = await register(email, password);
    if (res.success) {
      // TODO: set up user
      // TODO: implement dashboard UI
      // navigateTo('dashboard');
      console.info('register succeeded.');
    } else {
      switch (res.errorType) {
        case 'NETWORK':
          // TODO: display network err msg
          console.error('register failed: network.');
          break;
        case 'VALIDATION':
          // TODO: display validation err msg
          console.error('register failed: validation.');
          break;
        case 'CONFLICT':
          // TODO: display conflict err msg
          console.error('register failed: conflict.');
          break;
        case 'RATE_LIMIT':
          // TODO: display rate err msg
          console.error('register failed: rate.');
          break;
        default:
          // TODO: display unknown err msg
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
