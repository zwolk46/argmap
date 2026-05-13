import type { ReactElement } from "react";
import { useCascadeConfirmation } from "../../hooks/use-cascade-confirmation";
import { ConfirmDialog } from "../../primitives";
import { CascadeSummaryTree } from "./cascade-summary-tree";

export function CascadeDeleteDialog(): ReactElement | null {
  const { phase, summary, confirm, cancel } = useCascadeConfirmation();

  if (phase === "idle" || !summary) return null;

  const n_nodes = summary.cascade_nodes.length;
  const n_edges = summary.cascade_edges.length;
  const node_s = n_nodes !== 1 ? "s" : "";
  const edge_s = n_edges !== 1 ? "s" : "";
  const confirm_label = `Delete ${n_nodes} node${node_s} and ${n_edges} edge${edge_s}`;

  return (
    <ConfirmDialog
      open={phase === "confirming"}
      title="Delete and cascade?"
      confirm_label={confirm_label}
      confirm_variant="danger"
      onConfirm={confirm}
      onCancel={cancel}
    >
      <CascadeSummaryTree report={summary} />
    </ConfirmDialog>
  );
}
