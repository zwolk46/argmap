import * as React from "react";
import type { ReactElement } from "react";
import { useAuth } from "./auth-context";

/**
 * Single-screen email + password auth. Toggle between sign-in and sign-up
 * via the bottom link. Designed to be the only thing visible when the user
 * isn't authenticated; the App is gated behind `useAuth().user`.
 *
 * Visual: small centered card, system fonts, no design-token dependence
 * (these may not be ready at first paint).
 */

type Mode = "sign_in" | "sign_up";

export function SignInScreen(): ReactElement {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = React.useState<Mode>("sign_in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [signup_success, setSignupSuccess] = React.useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fn = mode === "sign_in" ? signIn : signUp;
      const err = await fn(email, password);
      if (err) {
        setError(err);
      } else if (mode === "sign_up") {
        // Email confirmation is the Supabase default. Most projects also
        // enable "auto-confirm" for dev, in which case auth-state-change
        // fires immediately and this screen unmounts.
        setSignupSuccess(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>Loading your workspace…</div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-canvas, #faf8f4)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        data-testid="sign-in-form"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--color-surface-elevated, #ffffff)",
          padding: "32px 28px",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid var(--color-border-subtle, #e5e7eb)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              marginBottom: 6,
              color: "var(--color-text-primary, #111827)",
            }}
          >
            {mode === "sign_in" ? "Sign in to argmap" : "Create your argmap account"}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary, #6b7280)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {mode === "sign_in"
              ? "Your frames and sessions are saved to your account."
              : "Frames and sessions you build are saved to your account and reachable from any device."}
          </p>
        </header>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--color-text-secondary, #6b7280)" }}>Email</span>
          <input
            data-testid="sign-in-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            style={{
              padding: "8px 10px",
              fontSize: 14,
              border: "1px solid var(--color-border-default, #d1d5db)",
              borderRadius: 6,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--color-text-secondary, #6b7280)" }}>Password</span>
          <input
            data-testid="sign-in-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            style={{
              padding: "8px 10px",
              fontSize: 14,
              border: "1px solid var(--color-border-default, #d1d5db)",
              borderRadius: 6,
            }}
          />
          {mode === "sign_up" ? (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary, #9ca3af)" }}>
              Minimum 8 characters.
            </span>
          ) : null}
        </label>

        {error ? (
          <div
            data-testid="sign-in-error"
            role="alert"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              background: "var(--color-severity-error-bg, #fee2e2)",
              color: "var(--color-severity-error, #b91c1c)",
              borderLeft: "3px solid var(--color-severity-error, #dc2626)",
              borderRadius: 4,
            }}
          >
            {error}
          </div>
        ) : null}
        {signup_success ? (
          <div
            data-testid="sign-up-pending"
            role="status"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              background: "var(--color-background-success, #d1fae5)",
              color: "var(--color-text-success, #065f46)",
              borderLeft: "3px solid #10b981",
              borderRadius: 4,
            }}
          >
            Check your email for a confirmation link. Once confirmed, return here to sign in.
          </div>
        ) : null}

        <button
          type="submit"
          data-testid="sign-in-submit"
          disabled={busy || email.length === 0 || password.length === 0}
          style={{
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 500,
            background: busy
              ? "var(--color-text-tertiary, #9ca3af)"
              : "var(--color-mode-current-accent, #6366f1)",
            color: "var(--color-text-on-accent, #ffffff)",
            border: "none",
            borderRadius: 6,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy
            ? mode === "sign_in"
              ? "Signing in…"
              : "Creating account…"
            : mode === "sign_in"
              ? "Sign in"
              : "Create account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 13 }}>
          {mode === "sign_in" ? (
            <button
              type="button"
              onClick={() => {
                setMode("sign_up");
                setError(null);
                setSignupSuccess(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-mode-current-accent, #6366f1)",
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
              }}
            >
              Don't have an account? Create one.
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("sign_in");
                setError(null);
                setSignupSuccess(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-mode-current-accent, #6366f1)",
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
              }}
            >
              Already have an account? Sign in.
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
