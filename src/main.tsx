import React from "react";
import ReactDOM from "react-dom/client";
import type { LlmSettings } from "@/schema";
import { IndexedDbRepository, createAutosaveController, createCrossTabBus } from "@/persistence";
import { frameActions, sessionActions } from "@/modes";
import { App } from "./App";

const repo = new IndexedDbRepository();
const crosstab = createCrossTabBus();
// P0-2: autosave publishes typed events (frame_saved / session_saved /
// app_state_changed) on every successful flush so peer tabs can refresh.
const autosave = createAutosaveController({ repo, crosstab });

const llm_settings_default: LlmSettings = {
  build_time_hooks_enabled: false,
  runtime_hooks_enabled: false,
  output_time_hooks_enabled: false,
  invocations: [],
};

const now = (): string => new Date().toISOString();
const generateId = (): string => crypto.randomUUID();

function BootError({ message }: { message: string }): React.ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        maxWidth: 480,
        margin: "10vh auto",
        background: "var(--color-severity-error-bg, #fee2e2)",
        color: "var(--color-severity-error, #b91c1c)",
        borderLeft: "var(--border-thick, 3px) solid var(--color-severity-error, #dc2626)",
        borderRadius: "var(--radius-md, 6px)",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "var(--font-size-sm, 13px)",
        lineHeight: 1.6,
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-md, 14px)",
          fontWeight: "var(--font-weight-semibold, 600)",
          margin: 0,
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        We couldn't open your local storage
      </h1>
      <p style={{ margin: 0 }}>{message}</p>
      <p style={{ margin: "var(--space-2, 8px) 0 0" }}>
        Try reloading the page. If the problem persists, your browser may be in private mode or
        out of storage.
      </p>
    </div>
  );
}

function BootGate(): React.ReactElement {
  const [status, setStatus] = React.useState<"loading" | "ready" | { error: string }>("loading");
  React.useEffect(() => {
    let cancelled = false;
    repo
      .openOrUpgrade()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setStatus({ error: msg });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    // Plain text — design tokens may not have loaded yet on cold boot.
    return <div style={{ padding: 24 }}>Loading your workspace…</div>;
  }
  if (typeof status === "object") {
    return <BootError message={status.error} />;
  }
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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BootGate />
  </React.StrictMode>,
);
