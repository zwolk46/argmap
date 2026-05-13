import type { ReactElement } from "react";
import type { EdgeRef, NodeRef, Edge } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { EdgeEditor } from "./editors";

export interface InspectorEdgeProps {
  edge_id: EdgeRef;
  on_navigate_to_node: (node_id: NodeRef) => void;
}

export function InspectorEdge(props: InspectorEdgeProps): ReactElement {
  const { edge_id, on_navigate_to_node: _on_navigate_to_node } = props;
  const edge = useFrameStore((s) => s.frame_version?.edges.find((e) => e.id === edge_id));
  const { frame_store } = useRepository();

  if (!edge) {
    return (
      <div
        style={{
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        Edge not found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3, 12px)" }}>
      {/* Header */}
      <div
        style={{
          paddingBottom: "var(--space-3, 12px)",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <div style={LABEL_STYLE}>Edge type</div>
        <div style={{ fontSize: "var(--font-size-sm, 13px)", fontWeight: 500 }}>{edge.type}</div>
        <div style={{ ...LABEL_STYLE, marginTop: "8px" }}>Direction</div>
        <div
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            fontFamily: "monospace",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {edge.source.slice(0, 8)} → {edge.target.slice(0, 8)}
        </div>
      </div>

      {/* Label */}
      <div>
        <label style={LABEL_STYLE} htmlFor={`edge-label-${edge_id}`}>
          Label
        </label>
        <input
          id={`edge-label-${edge_id}`}
          type="text"
          defaultValue={(edge as { label?: string }).label ?? ""}
          onBlur={(e) => {
            frame_store.getState().applyPatch({
              kind: "edge_edited",
              edge_id,
              partial: { label: e.currentTarget.value } as Partial<Edge>,
            });
          }}
          style={INPUT_STYLE}
        />
      </div>

      {/* Type-specific fields */}
      <EdgeEditor edge={edge} />

      {/* Notes */}
      <div>
        <label style={LABEL_STYLE} htmlFor={`edge-notes-${edge_id}`}>
          Notes
        </label>
        <textarea
          id={`edge-notes-${edge_id}`}
          rows={2}
          defaultValue={(edge as { notes?: string }).notes ?? ""}
          onBlur={(e) => {
            frame_store.getState().applyPatch({
              kind: "edge_edited",
              edge_id,
              partial: { notes: e.currentTarget.value } as Partial<Edge>,
            });
          }}
          style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          paddingTop: "var(--space-3, 12px)",
          borderTop: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            frame_store.getState().applyPatch({ kind: "edge_removed", edge_id });
          }}
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
          Delete edge
        </button>
      </div>
    </div>
  );
}

import type * as React from "react";

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
  marginBottom: "4px",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
};
