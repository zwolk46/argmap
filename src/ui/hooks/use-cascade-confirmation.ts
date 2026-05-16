import * as React from "react";
import type { NodeRef } from "@/schema";
import type { CascadeReport } from "@/runtime";
import { useFrameStore, useRepository, selectCascadeSummary } from "@/state";

export type CascadeConfirmationPhase = "idle" | "confirming";

export interface CascadeConfirmationState {
  phase: CascadeConfirmationPhase;
  summary: CascadeReport | null;
  node_id: NodeRef | null;
  request: (node_id: NodeRef) => void;
  confirm: () => void;
  cancel: () => void;
}

export function useCascadeConfirmation(): CascadeConfirmationState {
  const frame_version = useFrameStore((s) => s.frame_version);
  const { frame_store } = useRepository();

  const [phase, setPhase] = React.useState<CascadeConfirmationPhase>("idle");
  const [node_id, setNodeId] = React.useState<NodeRef | null>(null);
  const [summary, setSummary] = React.useState<CascadeReport | null>(null);
  // Queue of pending cascade confirmations. When the caller requests a
  // batch (multi-select delete), only the first lands in the visible
  // dialog; the rest queue up and surface on confirm/cancel of the prior.
  // Using a ref (not state) avoids re-renders for queue-only mutations
  // and sidesteps the React-batching bug that previously made repeated
  // `request()` calls collapse to only the last id's cascade.
  const queue_ref = React.useRef<NodeRef[]>([]);

  const presentNext = React.useCallback(() => {
    if (!frame_version) return false;
    const next = queue_ref.current.shift();
    if (!next) return false;
    const report = selectCascadeSummary(frame_version, { node_ids: [next] });
    setNodeId(next);
    setSummary(report);
    setPhase("confirming");
    return true;
  }, [frame_version]);

  const request = React.useCallback(
    (target: NodeRef) => {
      if (!frame_version) return;
      queue_ref.current.push(target);
      if (phase === "idle") {
        presentNext();
      }
    },
    [frame_version, phase, presentNext],
  );

  const confirm = React.useCallback(() => {
    if (!node_id || !summary) return;
    frame_store.getState().applyPatch({
      kind: "node_removed",
      node_id,
      cascade: {
        node_ids: summary.cascade_nodes.map((n) => n.node_id),
        edge_ids: summary.cascade_edges.map((e) => e.edge_id),
      },
    });
    setPhase("idle");
    setNodeId(null);
    setSummary(null);
    // Defer to next tick so React applies the idle phase before the next
    // confirmation surfaces.
    queueMicrotask(() => {
      presentNext();
    });
  }, [node_id, summary, frame_store, presentNext]);

  const cancel = React.useCallback(() => {
    setPhase("idle");
    setNodeId(null);
    setSummary(null);
    // Cancelling drops the rest of the queued batch — the user told us to
    // stop. Without this, a Cancel on the first dialog would still advance
    // to the second queued id.
    queue_ref.current = [];
  }, []);

  return { phase, summary, node_id, request, confirm, cancel };
}
