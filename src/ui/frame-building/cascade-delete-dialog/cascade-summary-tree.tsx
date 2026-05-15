import type { ReactElement } from "react";
import type { CascadeReport } from "@/state";
import type { CascadeReason } from "@/runtime";
import { UIcon } from "../../primitives";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        The following nodes and edges will be permanently removed:
      </p>

      {cascade_nodes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <h3 className="argmap-section-heading">Nodes ({cascade_nodes.length})</h3>
          {cascade_nodes.map(({ node_id, reason }) => (
            <div
              key={node_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-1) var(--space-2)",
                background: "var(--color-surface-pane)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <UIcon
                name="trash"
                size={12}
                style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {node_id}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-tertiary)",
                  flexShrink: 0,
                }}
              >
                {reasonLabel(reason)}
              </span>
            </div>
          ))}
        </div>
      )}

      {cascade_edges.length > 0 && (
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            padding: "var(--space-2)",
            background: "var(--color-surface-pane)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {cascade_edges.length} edge{cascade_edges.length !== 1 ? "s" : ""} will also be removed.
        </div>
      )}
    </div>
  );
}
