import * as React from "react";
import type { ReactElement } from "react";
import { Button, Spinner, InlineAlert } from "../primitives";
import { useAuth } from "./auth-context";

/**
 * Single-screen email + password auth. Toggle between sign-in and sign-up
 * via the bottom link. Designed to be the only thing visible when the user
 * isn't authenticated; the App is gated behind `useAuth().user`.
 *
 * Visual: small centered card, design-token-driven typography and spacing
 * so the surface reads as part of the rest of the app rather than a foreign
 * pre-auth screen. Token fallbacks are intentionally omitted — `tokens.css`
 * is imported by `main.tsx` before this component renders, so the variables
 * are defined at first paint.
 *
 * A separate `loading` UI lives in AuthGate (main.tsx) — that LoadingScreen
 * paints while Supabase resolves the existing session, and only then mounts
 * either SignInScreen or SignedInApp.
 */

type Mode = "sign_in" | "sign_up";

export function SignInScreen(): ReactElement {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = React.useState<Mode>("sign_in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [signup_success, setSignupSuccess] = React.useState(false);

  const email_id = React.useId();
  const password_id = React.useId();

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

  // Once a sign-up email has been dispatched, lock the form so the user
  // can't double-submit while waiting for the confirmation link.
  const form_locked = busy || signup_success;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-canvas)",
        fontFamily: "var(--font-sans)",
        padding: "var(--space-5)",
      }}
    >
      <form
        onSubmit={onSubmit}
        data-testid="sign-in-form"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--color-surface-elevated)",
          padding: "var(--space-6) var(--space-5)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          border: "var(--border-thin) solid var(--color-border-subtle)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <header>
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              margin: 0,
              marginBottom: "var(--space-1)",
              color: "var(--color-text-primary)",
              letterSpacing: "var(--letter-spacing-tight)",
            }}
          >
            {mode === "sign_in" ? "Sign in to argmap" : "Create your argmap account"}
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              margin: 0,
              lineHeight: "var(--line-height-normal)",
            }}
          >
            {mode === "sign_in"
              ? "Your frames and sessions are saved to your account."
              : "Frames and sessions you build are saved to your account and reachable from any device."}
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label
            htmlFor={email_id}
            style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}
          >
            Email
          </label>
          <input
            id={email_id}
            data-testid="sign-in-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={form_locked}
            className="argmap-input"
            style={{ fontSize: "var(--font-size-base)" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <label
            htmlFor={password_id}
            style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}
          >
            Password
          </label>
          <input
            id={password_id}
            data-testid="sign-in-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={form_locked}
            className="argmap-input"
            style={{ fontSize: "var(--font-size-base)" }}
          />
          {mode === "sign_up" ? (
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-tertiary)",
              }}
            >
              Minimum 8 characters.
            </span>
          ) : null}
          {/* "Forgot password?" intentionally absent: the reset flow isn't
              wired through auth-context yet, and shipping a dead link
              ("Coming soon" tooltip on click) reads as cheap. Restore this
              once client.auth.resetPasswordForEmail() is connected. */}
        </div>

        {error ? (
          <InlineAlert kind="error" testId="sign-in-error">
            {error}
          </InlineAlert>
        ) : null}
        {signup_success ? (
          <InlineAlert kind="success" testId="sign-up-pending">
            Check your email for a confirmation link. Once confirmed, return here to sign in.
          </InlineAlert>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          data-testid="sign-in-submit"
          disabled={form_locked || email.length === 0 || password.length === 0}
          full_width
          leading={busy ? <Spinner size={14} /> : undefined}
        >
          {busy
            ? mode === "sign_in"
              ? "Signing in…"
              : "Creating account…"
            : mode === "sign_in"
              ? "Sign in"
              : "Create account"}
        </Button>

        <div style={{ textAlign: "center", fontSize: "var(--font-size-base)" }}>
          {mode === "sign_in" ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={form_locked}
              onClick={() => {
                setMode("sign_up");
                setError(null);
                setSignupSuccess(false);
              }}
            >
              Don't have an account? Create one.
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={form_locked}
              onClick={() => {
                setMode("sign_in");
                setError(null);
                setSignupSuccess(false);
              }}
            >
              Already have an account? Sign in.
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
