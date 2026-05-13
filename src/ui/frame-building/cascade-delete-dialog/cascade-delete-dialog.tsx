import type { ReactElement } from "react";
import type { CascadeConfirmationState } from "../../hooks/use-cascade-confirmation";
import { ConfirmDialog } from "../../primitives";
import { CascadeSummaryTree } from "./cascade-summary-tree";

export interface CascadeDeleteDialogProps {
  /**
   * The cascade-confirmation state instance from the parent page. P0-7: the
   * dialog must NOT call useCascadeConfirmation() itself — that would
   * produce a second hook instance with its own useState, and the page's
   * `.request(...)` calls would never reach this dialog's state.
   */
  cascade: CascadeConfirmationState;
}

export function CascadeDeleteDialog(props: CascadeDeleteDialogProps): ReactElement | null {
  const { phase, summary, confirm, cancel } = props.cascade;

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
