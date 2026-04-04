import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./login_page";
import { AuthError } from "../types/auth";
import { describe, it, expect, vi } from "vitest";

describe("LoginPage", () => {
  it("switches to Sign Up and validates mismatched passwords", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(
      within(screen.getByRole("tablist")).getByRole("button", {
        name: /sign up/i,
      }),
    );

    await user.type(screen.getByLabelText(/email/i), "reader@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "secret456");

    const signUpButtons = screen.getAllByRole("button", { name: /^sign up$/i });
    await user.click(signUpButtons[1]);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("shows AuthError from login and clears it when switching tabs", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(
      new AuthError("AUTH", "Invalid credentials"),
    );

    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/email/i), "reader@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("tablist")).getByRole("button", {
        name: /sign up/i,
      }),
    );

    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
  });

  it("shows generic register error and clears it when returning to login", async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockRejectedValue(new Error("boom"));

    render(<LoginPage onRegister={onRegister} />);

    await user.click(
      within(screen.getByRole("tablist")).getByRole("button", {
        name: /sign up/i,
      }),
    );
    await user.type(screen.getByLabelText(/email/i), "reader@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "secret123");
    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[1]);

    expect(
      await screen.findByText(/an unknown error occurred, please try again\./i),
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("tablist")).getByRole("button", {
        name: /login/i,
      }),
    );

    expect(
      screen.queryByText(/an unknown error occurred, please try again\./i),
    ).not.toBeInTheDocument();
  });

  it("shows generic login error for non-AuthError failures", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new Error("boom"));

    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByLabelText(/email/i), "reader@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    expect(
      await screen.findByText(/an unknown error occurred, please try again\./i),
    ).toBeInTheDocument();
  });

  it("shows AuthError from register", async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockRejectedValue(
      new AuthError("CONFLICT", "User already exists"),
    );

    render(<LoginPage onRegister={onRegister} />);

    await user.click(
      within(screen.getByRole("tablist")).getByRole("button", {
        name: /sign up/i,
      }),
    );
    await user.type(screen.getByLabelText(/email/i), "reader@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "secret123");
    await user.click(screen.getAllByRole("button", { name: /^sign up$/i })[1]);

    expect(await screen.findByText(/user already exists/i)).toBeInTheDocument();
  });
});
