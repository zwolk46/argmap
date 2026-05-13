import React from "react";
import ReactDOM from "react-dom/client";
import type { LlmSettings } from "@/schema";
import { SupabaseRepository, createAutosaveController, createCrossTabBus } from "@/persistence";
import { frameActions, sessionActions } from "@/modes";
import { App } from "./App";
import { getSupabaseClient, SupabaseConfigError } from "./supabase-client";
import { AuthProvider, useAuth, SignInScreen } from "./ui/auth";

const llm_settings_default: LlmSettings = {
  build_time_hooks_enabled: false,
  runtime_hooks_enabled: false,
  output_time_hooks_enabled: false,
  invocations: [],
};

const now = (): string => new Date().toISOString();
const generateId = (): string => crypto.randomUUID();

function BootError({ message, hint }: { message: string; hint?: string }): React.ReactElement {
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 520,
        margin: "10vh auto",
        background: "#fee2e2",
        color: "#b91c1c",
        borderLeft: "3px solid #dc2626",
        borderRadius: 6,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0, marginBottom: 8 }}>
        argmap couldn't start
      </h1>
      <p style={{ margin: 0 }}>{message}</p>
      {hint ? (
        <p style={{ margin: "8px 0 0", color: "#7f1d1d" }}>
          <strong>Hint:</strong> {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Gate: render the sign-in screen until auth resolves; once signed in,
 * build the per-user repository + autosave + crosstab and mount <App>.
 *
 * SupabaseRepository, autosave, and crosstab are all per-user — the user_id
 * is baked into the repo at construction so RLS works. Re-mounted on user
 * change via `key={user.id}` below.
 */
function AuthGate(): React.ReactElement {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }
  if (!user) {
    return <SignInScreen />;
  }
  return <SignedInApp key={user.id} user_id={user.id} />;
}

function SignedInApp({ user_id }: { user_id: string }): React.ReactElement {
  const client = getSupabaseClient();
  const repo = React.useMemo(
    () => new SupabaseRepository({ client, user_id, now, generateId }),
    [client, user_id],
  );
  // Channel-name suffix scopes broadcast to a single user so a multi-account
  // browser doesn't leak peer-tab events across accounts.
  const crosstab = React.useMemo(
    () => createCrossTabBus(`argmap_v1__crosstab__${user_id}`),
    [user_id],
  );
  const autosave = React.useMemo(
    () => createAutosaveController({ repo, crosstab }),
    [repo, crosstab],
  );

  return (
    <App
      repo={repo}
      autosave={autosave}
      crosstab={crosstab}
      frame_dispatch={frameActions}
      session_dispatch={sessionActions}
      llm_settings_default={llm_settings_default}
      now={now}
      generateId={generateId}
    />
  );
}

function Root(): React.ReactElement {
  let client;
  try {
    client = getSupabaseClient();
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      return (
        <BootError
          message={err.message}
          hint="Install the Supabase Vercel marketplace integration (see SETUP.md) — it sets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY automatically."
        />
      );
    }
    return <BootError message={err instanceof Error ? err.message : String(err)} />;
  }
  return (
    <AuthProvider client={client}>
      <AuthGate />
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
