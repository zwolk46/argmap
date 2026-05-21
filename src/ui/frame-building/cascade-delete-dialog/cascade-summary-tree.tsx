import type { ReactElement } from "react";
import { Trash } from "@phosphor-icons/react";
import type { CascadeReport } from "@/state";
import type { CascadeReason } from "@/runtime";

function reasonLabel(reason: CascadeReason): string {
  switch (reason.kind) {
    case "explicitly_requested":
      return "requested";
    case "orphaned_by_node":
      return `orphaned by ${reason.cause_node_id}`;
    case "orphaned_by_edge":
      return `orphaned by edge ${reason.cause_edge_id}`;
  }
}

export interface CascadeSummaryTreeProps {
  report: CascadeReport;
}

export function CascadeSummaryTree({ report }: CascadeSummaryTreeProps): ReactElement {
  const { cascade_nodes, cascade_edges } = report;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        The following nodes and edges will be permanently removed:
      </p>

      {cascade_nodes.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nodes ({cascade_nodes.length})
          </h3>
          {cascade_nodes.map(({ node_id, reason }) => (
            <div key={node_id} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1">
              <Trash size={12} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-sm text-foreground">{node_id}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{reasonLabel(reason)}</span>
            </div>
          ))}
        </div>
      )}

      {cascade_edges.length > 0 && (
        <div className="rounded-md bg-muted p-2 text-sm text-muted-foreground">
          {cascade_edges.length} edge{cascade_edges.length !== 1 ? "s" : ""} will also be removed.
        </div>
      )}
    </div>
  );
}
