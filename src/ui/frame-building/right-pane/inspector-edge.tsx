import type { ReactElement } from "react";
import type { EdgeRef, NodeRef, Edge } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../primitives";
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
        <h3
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
        >
          Edge type
        </h3>
        <div
          style={{ fontSize: "var(--font-size-sm, 13px)", fontWeight: "var(--font-weight-medium)" }}
        >
          {edge.type}
        </div>
        <h3
          className="argmap-section-heading"
          style={{ display: "block", marginTop: "var(--space-2)", marginBottom: "var(--space-1)" }}
        >
          Direction
        </h3>
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
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
          htmlFor={`edge-label-${edge_id}`}
        >
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="argmap-input"
        />
      </div>

      {/* Type-specific fields */}
      <EdgeEditor edge={edge} />

      {/* Notes */}
      <div>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
          htmlFor={`edge-notes-${edge_id}`}
        >
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
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
          className="argmap-input"
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          paddingTop: "var(--space-3, 12px)",
          borderTop: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <Button
          variant="destructive"
          size="md"
          onClick={() => {
            frame_store.getState().applyPatch({ kind: "edge_removed", edge_id });
          }}
        >
          Delete edge
        </Button>
      </div>
    </div>
  );
}
