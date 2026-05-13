import * as React from "react";
import type { FrameVersionId } from "@/schema";
import type { OrphanCandidate, OrphanResolution } from "@/state";
import { useRepository } from "@/state";

export interface UsePreviewMigrationInput {
  target_frame_version_id: FrameVersionId | null;
  enabled: boolean;
}

export type PreviewPhase =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "loaded";
      candidates: OrphanCandidate[];
      defaults: Map<string, OrphanResolution>;
    }
  | { kind: "failed"; error: { kind: string; message: string } };

export interface UsePreviewMigrationOutput {
  phase: PreviewPhase;
  retry: () => void;
}

export function buildDefaultResolutions(
  candidates: OrphanCandidate[],
): Map<string, OrphanResolution> {
  // P0-6: every resolution must carry source_node_id, otherwise the
  // repository's resolution_map stays empty and the migration silently
  // discards no carriers (data corruption — the session continues to
  // reference deleted nodes).
  const out = new Map<string, OrphanResolution>();
  for (const c of candidates) {
    if (c.suggested_kind === "reattach") {
      const default_target =
        c.reattach_candidates && c.reattach_candidates.length > 0
          ? c.reattach_candidates[0].target_node_id
          : undefined;
      out.set(c.carrier_id, {
        kind: "reattach",
        source_node_id: c.source_node_id,
        target_node_id: default_target,
      });
    } else {
      out.set(c.carrier_id, { kind: c.suggested_kind, source_node_id: c.source_node_id });
    }
  }
  return out;
}

export function usePreviewMigration(input: UsePreviewMigrationInput): UsePreviewMigrationOutput {
  const { session_store } = useRepository();
  const [phase, setPhase] = React.useState<PreviewPhase>({ kind: "idle" });
  const [epoch, setEpoch] = React.useState(0);

  React.useEffect(() => {
    if (!input.enabled || !input.target_frame_version_id) {
      setPhase({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setPhase({ kind: "loading" });
    session_store
      .getState()
      .previewMigration(input.target_frame_version_id)
      .then((candidates) => {
        if (cancelled) return;
        setPhase({
          kind: "loaded",
          candidates,
          defaults: buildDefaultResolutions(candidates),
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { kind?: string; message?: string };
        setPhase({
          kind: "failed",
          error: { kind: err.kind ?? "error", message: err.message ?? String(e) },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [input.enabled, input.target_frame_version_id, session_store, epoch]);

  return { phase, retry: () => setEpoch((e) => e + 1) };
}
