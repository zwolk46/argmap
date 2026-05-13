import type { ReactElement } from "react";
import type { CascadeReport } from "@/state";
import type { CascadeReason } from "@/runtime";
import { TypeIcon } from "../../primitives";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        The following nodes and edges will be permanently removed:
      </p>

      {cascade_nodes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1, 4px)" }}>
          <div
            style={{
              fontSize: "var(--font-size-xs, 11px)",
              fontWeight: 600,
              color: "var(--color-text-tertiary, #9ca3af)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Nodes ({cascade_nodes.length})
          </div>
          {cascade_nodes.map(({ node_id, reason }) => (
            <div
              key={node_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2, 8px)",
                padding: "var(--space-1, 4px) var(--space-2, 8px)",
                background: "var(--color-surface-pane, #f9fafb)",
                borderRadius: "var(--radius-sm, 4px)",
              }}
            >
              <TypeIcon node_type="Checkpoint" size={14} />
              <span
                style={{
                  fontSize: "var(--font-size-sm, 13px)",
                  color: "var(--color-text-primary, #111827)",
                  fontFamily: "var(--font-mono, monospace)",
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
                  fontSize: "var(--font-size-xs, 11px)",
                  color: "var(--color-text-tertiary, #9ca3af)",
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
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-secondary, #6b7280)",
            padding: "var(--space-2, 8px)",
            background: "var(--color-surface-pane, #f9fafb)",
            borderRadius: "var(--radius-sm, 4px)",
          }}
        >
          {cascade_edges.length} edge{cascade_edges.length !== 1 ? "s" : ""} will also be removed.
        </div>
      )}
    </div>
  );
}
