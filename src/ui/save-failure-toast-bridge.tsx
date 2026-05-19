import * as React from "react";
import type { ReactElement } from "react";
import { useRepository } from "@/state";
import { useToast } from "./primitives/toast";

/**
 * P0-22: Listens to AutosaveController's save_failed event and surfaces a
 * user-visible toast. Without this bridge, save failures (Quota, repo
 * errors) wrote to frame/session store `.error` strings that no UI
 * consumed after the first load — the user's data continued to fail to
 * persist with no feedback.
 *
 * Also surfaces app-state LOAD failures: AppStateStore.loadAppState forces
 * is_loaded=true on a non-singleton-missing error so the UI is interactive,
 * but every subsequent pin / dismiss / recent write will fail. Without
 * this second subscription the user has no signal that something is wrong.
 *
 * This component renders nothing; it only wires the subscriptions.
 */
export function SaveFailureToastBridge(): ReactElement | null {
  const { autosave, app_state_store } = useRepository();
  const { push, dismiss } = useToast();

  // Track the latest sticky save-failure toast per kind so retries replace
  // the prior toast instead of stacking, and a successful save can clear it.
  const active_toast_ids = React.useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    const unsubFailed = autosave.on("save_failed", (e) => {
      const error = e.error;
      const where = e.kind === "frame" ? "frame" : e.kind === "session" ? "session" : "app state";
      let message: string;
      // Discriminate by `error.kind` rather than instanceof, so the UI
      // doesn't have to take a value import from @/persistence
      // (Article II § 2 / Stream I import-boundary).
      if (error?.kind === "quota_exceeded") {
        message = `Couldn't save your ${where}: browser storage is full. Free space by deleting old frames or exporting them.`;
      } else if (error) {
        message = `Couldn't save your ${where}: ${error.message}`;
      } else {
        message = `Couldn't save your ${where}.`;
      }
      // Dismiss the prior failure toast for this kind (a retry shouldn't
      // stack a second permanent error on top of the first).
      const prior = active_toast_ids.current.get(e.kind);
      if (prior) dismiss(prior);
      const id = push({ kind: "error", message, duration_ms: 0 });
      active_toast_ids.current.set(e.kind, id);
    });
    const unsubSucceeded = autosave.on("save_succeeded", (e) => {
      // Clear the sticky failure toast for the same kind once a save lands.
      const prior = active_toast_ids.current.get(e.kind);
      if (prior) {
        dismiss(prior);
        active_toast_ids.current.delete(e.kind);
      }
    });
    return () => {
      unsubFailed();
      unsubSucceeded();
    };
  }, [autosave, push, dismiss]);

  React.useEffect(() => {
    let last_error: string | null = app_state_store.getState().error;
    const unsubscribe = app_state_store.subscribe((state) => {
      const next_error = state.error;
      if (next_error && next_error !== last_error && state.is_loaded) {
        push({
          kind: "error",
          message: `Couldn't load your saved workspace state: ${next_error}. Pins, recents, and dismissals may not persist until you reload the page.`,
          duration_ms: 0,
        });
      }
      last_error = next_error;
    });
    return unsubscribe;
  }, [app_state_store, push]);

  return null;
}
