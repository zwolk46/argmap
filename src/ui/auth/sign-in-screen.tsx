import * as React from "react";
import type { ReactElement } from "react";
import { Spinner } from "../primitives";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Alert, AlertDescription } from "#components/ui/alert";
import { useAuth } from "./auth-context";

/**
 * Single-screen email + password auth. Toggle between sign-in and sign-up
 * via the bottom link. Designed to be the only thing visible when the user
 * isn't authenticated; the App is gated behind `useAuth().user`.
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
  const error_id = React.useId();
  const password_hint_id = React.useId();

  // §13 #18: link the password length hint and any inline error back to the
  // inputs that produced them. Supabase's auth errors don't reliably identify
  // which field is at fault, so when an error is shown we mark both inputs
  // aria-invalid and point both at the error message.
  const password_describedby =
    [mode === "sign_up" ? password_hint_id : null, error ? error_id : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const email_describedby = error ? error_id : undefined;

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
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-canvas)] p-5">
      <form
        onSubmit={onSubmit}
        data-testid="sign-in-form"
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10"
      >
        <header>
          <h1 className="m-0 mb-1 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {mode === "sign_in" ? "Sign in to argmap" : "Create your argmap account"}
          </h1>
          <p className="m-0 text-sm leading-normal text-[var(--color-text-secondary)]">
            {mode === "sign_in"
              ? "Your frames and sessions are saved to your account."
              : "Frames and sessions you build are saved to your account and reachable from any device."}
          </p>
        </header>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={email_id}>Email</Label>
          <Input
            id={email_id}
            data-testid="sign-in-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={form_locked}
            aria-invalid={error ? true : undefined}
            aria-describedby={email_describedby}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={password_id}>Password</Label>
          <Input
            id={password_id}
            data-testid="sign-in-password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={form_locked}
            aria-invalid={error ? true : undefined}
            aria-describedby={password_describedby}
          />
          {mode === "sign_up" ? (
            <span id={password_hint_id} className="text-xs text-[var(--color-text-tertiary)]">
              Minimum 8 characters.
            </span>
          ) : null}
          {/* "Forgot password?" intentionally absent: the reset flow isn't
              wired through auth-context yet, and shipping a dead link reads
              as cheap. Restore once resetPasswordForEmail() is connected. */}
        </div>

        {error ? (
          <Alert variant="destructive" id={error_id} data-testid="sign-in-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {signup_success ? (
          <Alert data-testid="sign-up-pending">
            <AlertDescription>
              Check your email for a confirmation link. Once confirmed, return here to sign in.
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          variant="default"
          size="lg"
          data-testid="sign-in-submit"
          disabled={form_locked || email.length === 0 || password.length === 0}
          className="w-full"
        >
          {busy ? <Spinner size={14} decorative /> : null}
          {busy
            ? mode === "sign_in"
              ? "Signing in…"
              : "Creating account…"
            : mode === "sign_in"
              ? "Sign in"
              : "Create account"}
        </Button>

        <div className="text-center text-sm">
          {mode === "sign_in" ? (
            <Button
              type="button"
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
              type="button"
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
