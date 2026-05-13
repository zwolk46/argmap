import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { useFrameStore } from "@/state";

export interface InspectorMultiProps {
  node_ids: ReadonlyArray<NodeRef>;
  edge_ids: ReadonlyArray<EdgeRef>;
  on_request_delete_multi: (node_ids: ReadonlyArray<NodeRef>) => void;
}

export function InspectorMulti(props: InspectorMultiProps): ReactElement {
  const { node_ids, edge_ids, on_request_delete_multi } = props;
  const frame_version = useFrameStore((s) => s.frame_version);

  const node_count = node_ids.length;
  const edge_count = edge_ids.length;

  const node_types = frame_version
    ? [
        ...new Set(
          node_ids.map((id) => frame_version.nodes.find((n) => n.id === id)?.type).filter(Boolean),
        ),
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      {/* Header */}
      <div
        style={{
          paddingBottom: "var(--space-3, 12px)",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <div
          style={{ fontSize: "var(--font-size-sm, 13px)", fontWeight: 500, marginBottom: "4px" }}
        >
          Multi-selection
        </div>
        <div
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {node_count > 0 && `${node_count} node${node_count !== 1 ? "s" : ""}`}
          {node_count > 0 && edge_count > 0 && ", "}
          {edge_count > 0 && `${edge_count} edge${edge_count !== 1 ? "s" : ""}`}
          {" selected"}
        </div>
        {node_types.length > 0 && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
            Types: {node_types.join(", ")}
          </div>
        )}
      </div>

      {/* Bulk delete */}
      {node_count > 0 && (
        <div>
          <div
            style={{
              textTransform: "uppercase",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-secondary, #6b7280)",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Bulk actions
          </div>
          <button
            type="button"
            onClick={() => on_request_delete_multi(node_ids)}
            style={{
              padding: "6px 12px",
              background: "var(--color-danger-subtle, #fef2f2)",
              color: "var(--color-danger, #dc2626)",
              border: "1px solid var(--color-danger-border, #fca5a5)",
              borderRadius: "var(--radius-sm, 4px)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm, 13px)",
            }}
          >
            Delete {node_count} node{node_count !== 1 ? "s" : ""}
            {edge_count > 0 ? ` and ${edge_count} edge${edge_count !== 1 ? "s" : ""}` : ""}
          </button>
        </div>
      )}

      {/* Hint */}
      <div
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-tertiary, #9ca3af)",
        }}
      >
        Select a single item to edit its properties.
      </div>
    </div>
  );
}
