import { useState } from 'react'
import '../pages/signup_page.css'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }
    setError('')
  }

  return (
    <main className="signup-page">
      <section className="signup-panel">
        <header className="signup-header">
          <h1 className="signup-kicker">Welcome back</h1>
          <p className="signup-title">Log in to continue your learning</p>
        </header>

        <form className="signup-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="signup-button" type="submit">
            Log In
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  )
}
