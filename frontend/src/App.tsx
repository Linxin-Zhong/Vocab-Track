import { useState } from "react";
import "./App.css";
import { StartingPage } from "./pages/starting_page";
import { LoginPage } from "./pages/login_page";
import { login, register, logout } from "./services/authService";
import { Dashboard } from "./pages/dashboard";
import { AuthError } from "./types/auth";

type Screen = "landing" | "signup" | "dashboard";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await login(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      navigateTo("dashboard");
      console.log("login succeeded.");
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case "AUTH":
          console.error("login failed: auth");
          throw new AuthError("AUTH", "Invalid credentials");
        case "NETWORK":
          console.error("login failed: network");
          throw new AuthError("NETWORK", "Network error");
        case "RATE_LIMIT":
          console.error("login failed: rate limit");
          throw new AuthError("RATE_LIMIT", "Too many attempts");
        default:
          console.error("login failed: unknown");
          throw new AuthError("UNKNOWN", "Unknown error");
      }
    }
  };

  const handleRegister = async (email: string, password: string) => {
    const res = await register(email, password);
    if (res.success) {
      // TODO: set up user & implement dashboard UI
      navigateTo("dashboard");
      console.info("register succeeded.");
    } else {
      // TODO: display error messages.
      switch (res.errorType) {
        case "NETWORK":
          console.error("register failed: network.");
          throw new AuthError("NETWORK", "Network error");
        case "VALIDATION":
          console.error("register failed: validation.");
          throw new AuthError("VALIDATION", "Validation error");
        case "CONFLICT":
          console.error("register failed: conflict.");
          throw new AuthError("CONFLICT", "User already exists");
        case "RATE_LIMIT":
          console.error("register failed: rate.");
          throw new AuthError("RATE_LIMIT", "Too many attempts");
        default:
          console.error("register failed: unknown.");
          throw new AuthError("UNKNOWN", "Unknown error");
      }
    }
  };

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      console.info("logout succeeded.");
    } else {
      console.error("logout failed,", res.errorType);
    }
    // TODO: reset user.
    navigateTo("landing");
  };

  return (
    <div>
      {currentScreen === "landing" && (
        <StartingPage onGetStarted={() => navigateTo("signup")} />
      )}
      {currentScreen === "signup" && (
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      )}
      {currentScreen === "dashboard" && (
        <Dashboard
          wordsReviewedToday={0}
          onStartSession={() => {
            console.log("start study button clicked");
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
