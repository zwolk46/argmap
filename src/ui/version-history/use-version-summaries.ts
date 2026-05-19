import * as React from "react";
import type { FrameId, SessionId } from "@/schema";
import type { FrameVersionSummary, ArgumentSessionVersionSummary } from "@/state";
import { useRepository, useFrameStore, useSessionStore } from "@/state";

export type SummaryUnion = FrameVersionSummary | ArgumentSessionVersionSummary;

// §8 #4: the second variant of each kind permits a null id so callers gate
// network-issuing fetches without resorting to a sentinel like "__unused__"
// (which became a real query that returned errors).
export type VersionSummariesArg =
  | { kind: "frame"; frame_id: FrameId | null }
  | { kind: "session"; session_id: SessionId | null };

export interface VersionSummariesResult {
  status: "loading" | "ready" | "error";
  summaries: ReadonlyArray<SummaryUnion>;
  error?: Error;
}

const EMPTY: ReadonlyArray<SummaryUnion> = [];

export function useVersionSummaries(arg: VersionSummariesArg): VersionSummariesResult {
  const { repository } = useRepository();
  const [result, setResult] = React.useState<VersionSummariesResult>({
    status: "loading",
    summaries: EMPTY,
  });

  // Re-fetch when the current version id changes (local save or peer-tab save).
  const frame_current_id = useFrameStore((s) => s.frame_version?.id ?? null);
  const session_current_id = useSessionStore((s) => s.session?.current_version_id ?? null);
  const dependency = arg.kind === "frame" ? frame_current_id : session_current_id;

  const arg_key = arg.kind === "frame" ? `frame:${arg.frame_id}` : `session:${arg.session_id}`;
  // Snapshot the id once per render so the effect closure doesn't reach into
  // a stale `arg` reference on later runs.
  const id = arg.kind === "frame" ? arg.frame_id : arg.session_id;

  React.useEffect(() => {
    let cancelled = false;
    // §8 #4: null id means the caller doesn't have an entity to fetch yet
    // (e.g., frame_id is still null before the frame loads). Bail without
    // issuing a query and surface a stable "ready with empty list" state.
    if (id === null) {
      setResult({ status: "ready", summaries: EMPTY });
      return;
    }
    // Don't reset to "loading" on every dependency change (autosave bumps
    // current_version_id frequently). Keep showing the prior list until
    // the new fetch lands — preserves selection and scroll position
    // and avoids flashing "Loading versions…" on every save.
    setResult((prev) => (prev.status === "ready" ? prev : { status: "loading", summaries: EMPTY }));
    const promise =
      arg.kind === "frame"
        ? repository.listFrameVersionSummaries(id as FrameId)
        : repository.listSessionVersionSummaries(id as SessionId);
    promise
      .then((summaries) => {
        if (cancelled) return;
        setResult({ status: "ready", summaries });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setResult({
          status: "error",
          summaries: EMPTY,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arg_key, dependency, repository, id]);

  return result;
}
