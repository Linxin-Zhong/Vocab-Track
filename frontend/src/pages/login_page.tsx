import { useState } from "react";
import "./login_page.css";
import { AuthError } from "../types/auth";

type LoginPageProps = {
  onLogin?: (username: string, password: string) => void;
  onRegister?: (username: string, password: string) => void;
};

type ActiveTab = "login" | "register";

export function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await onLogin?.(email, password);
      console.log("1234")
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    try {
      await onRegister?.(email, password);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };
  return (
    <main className="login-page">
      <section className="login-panel">
        <header className="login-header">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Log in to continue your learning</p>
        </header>

        <div className="login-tabs" role="tablist">
          <button
            type="button"
            className={
              activeTab === "login"
                ? "tab-button tab-active"
                : "tab-button tab-inactive"
            }
            onClick={() => {
              setActiveTab("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={
              activeTab === "register"
                ? "tab-button tab-active"
                : "tab-button tab-inactive"
            }
            onClick={() => {
              setActiveTab("register");
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        {activeTab === "login" ? (
          <form className="login-form" onSubmit={handleLoginSubmit}>
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

            <button className="primary-button" type="submit">
              Log In
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleRegisterSubmit}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="field-input"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                className="field-input"
                type="password"
                name="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Confirm Password</span>
              <input
                className="field-input"
                type="password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
            </label>

            <button className="primary-button" type="submit">
              Sign Up
            </button>
          </form>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
