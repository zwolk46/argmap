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
 * This component renders nothing; it only wires the subscription.
 */
export function SaveFailureToastBridge(): ReactElement | null {
  const { autosave } = useRepository();
  const { push } = useToast();

  React.useEffect(() => {
    const unsubscribe = autosave.on("save_failed", (e) => {
      const error = e.error;
      const where =
        e.kind === "frame" ? "frame" : e.kind === "session" ? "session" : "app state";
      let message: string;
      // Discriminate by `error.kind` rather than instanceof, so the UI
      // doesn't have to take a value import from @/persistence
      // (Article II § 2 / Stream I import-boundary).
      if (error?.kind === "quota_exceeded") {
        message =
          `Couldn't save your ${where}: browser storage is full. Free space by deleting old frames or exporting them.`;
      } else if (error) {
        message = `Couldn't save your ${where}: ${error.message}`;
      } else {
        message = `Couldn't save your ${where}.`;
      }
      push({ kind: "error", message, duration_ms: 0 });
    });
    return unsubscribe;
  }, [autosave, push]);

  return null;
}
