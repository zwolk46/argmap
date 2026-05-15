import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { useFrameStore } from "@/state";
import { Button } from "../../primitives";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div
        style={{
          paddingBottom: "var(--space-3)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            marginBottom: "4px",
          }}
        >
          Multi-selection
        </div>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
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
              marginTop: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            Types: {node_types.join(", ")}
          </div>
        )}
      </div>

      {/* Bulk delete */}
      {node_count > 0 && (
        <div>
          <h3 className="argmap-section-heading" style={{ marginBottom: "var(--space-2)" }}>
            Bulk actions
          </h3>
          <Button variant="destructive" size="md" onClick={() => on_request_delete_multi(node_ids)}>
            Delete {node_count} node{node_count !== 1 ? "s" : ""}
            {edge_count > 0 ? ` and ${edge_count} edge${edge_count !== 1 ? "s" : ""}` : ""}
          </Button>
        </div>
      )}

      {/* Hint */}
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-tertiary)",
        }}
      >
        Select a single item to edit its properties.
      </div>
    </div>
  );
}
