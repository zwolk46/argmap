import * as React from "react";
import type { FrameId, SessionId } from "@/schema";
import type { FrameVersionSummary, ArgumentSessionVersionSummary } from "@/state";
import { useRepository, useFrameStore, useSessionStore } from "@/state";

export type SummaryUnion = FrameVersionSummary | ArgumentSessionVersionSummary;

export type VersionSummariesArg =
  | { kind: "frame"; frame_id: FrameId }
  | { kind: "session"; session_id: SessionId };

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

  React.useEffect(() => {
    let cancelled = false;
    // Don't reset to "loading" on every dependency change (autosave bumps
    // current_version_id frequently). Keep showing the prior list until
    // the new fetch lands — preserves selection and scroll position
    // and avoids flashing "Loading versions…" on every save.
    setResult((prev) =>
      prev.status === "ready" ? prev : { status: "loading", summaries: EMPTY },
    );
    const promise =
      arg.kind === "frame"
        ? repository.listFrameVersionSummaries(arg.frame_id)
        : repository.listSessionVersionSummaries(arg.session_id);
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
  }, [arg_key, dependency, repository]);

  return result;
}
