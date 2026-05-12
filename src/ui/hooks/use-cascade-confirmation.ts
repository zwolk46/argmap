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

  const request = React.useCallback(
    (target: NodeRef) => {
      if (!frame_version) return;
      const report = selectCascadeSummary(frame_version, { node_ids: [target] });
      setNodeId(target);
      setSummary(report);
      setPhase("confirming");
    },
    [frame_version],
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
  }, [node_id, summary, frame_store]);

  const cancel = React.useCallback(() => {
    setPhase("idle");
    setNodeId(null);
    setSummary(null);
  }, []);

  return { phase, summary, node_id, request, confirm, cancel };
}
