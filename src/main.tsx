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

// crypto.randomUUID() requires Safari 15.4+ and a secure context. We
// fall through to a manually-built v4 UUID (using crypto.getRandomValues
// for the entropy, which has wider browser support) so an older Safari
// doesn't TypeError at app boot the first time we try to mint an id.
const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // RFC 4122 v4 — set version (top 4 bits of byte 6 to 0100) and
    // variant (top 2 bits of byte 8 to 10).
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last-resort fallback for ancient environments — Math.random is not
  // cryptographically strong but won't collide at session scale.
  const rand = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${rand()}${rand()}-${rand()}-4${rand().slice(1)}-${rand()}-${rand()}${rand()}${rand()}`;
};

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

  // Flush any pending autosave debounce on tab close / refresh. Without
  // this, edits made within the 5s idle window (or 30s max window) are
  // lost when the user closes the tab. `pagehide` fires for both tab
  // close AND browser navigation away (covers Safari's bfcache case);
  // `beforeunload` doesn't fire on iOS. Using both is the production
  // pattern.
  React.useEffect(() => {
    function flushOnHide() {
      // Promise is fire-and-forget — there's no time to await here.
      // Supabase's queueMicrotask gives the in-flight PATCH a chance to
      // hit `fetch` before the browser tears down the page.
      void autosave.flushAll();
    }
    function flushOnVisibilityHidden() {
      // iOS Safari throttles setTimeout in background tabs to ≥1000ms
      // (and ≥60s after ~5 min), then aggressively kills the page. The
      // autosave debounce can stretch past the kill point, dropping the
      // payload. Flush on visibilitychange→hidden to cover backgrounding
      // without a full unload.
      if (document.visibilityState === "hidden") flushOnHide();
    }
    window.addEventListener("pagehide", flushOnHide);
    window.addEventListener("beforeunload", flushOnHide);
    document.addEventListener("visibilitychange", flushOnVisibilityHidden);
    return () => {
      window.removeEventListener("pagehide", flushOnHide);
      window.removeEventListener("beforeunload", flushOnHide);
      document.removeEventListener("visibilitychange", flushOnVisibilityHidden);
    };
  }, [autosave]);

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
