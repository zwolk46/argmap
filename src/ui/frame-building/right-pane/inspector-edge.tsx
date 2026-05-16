import type { ReactElement } from "react";
import type { EdgeRef, NodeRef, Edge, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../primitives";
import { EdgeEditor } from "./editors";

function describeNode(nodes: ReadonlyArray<Node>, node_id: NodeRef): string {
  const n = nodes.find((x) => x.id === node_id);
  if (!n) return node_id.slice(0, 8);
  if ("question" in n && typeof n.question === "string") return n.question;
  if ("statement" in n && typeof n.statement === "string") return n.statement;
  if ("name" in n && typeof (n as { name?: unknown }).name === "string")
    return (n as { name: string }).name;
  if ("citation" in n && typeof (n as { citation?: unknown }).citation === "string")
    return (n as { citation: string }).citation;
  return `${n.type} ${node_id.slice(0, 8)}`;
}

function EndpointButton({
  label,
  onClick,
}: {
  node_id: NodeRef;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Jump to ${label}`}
      style={{
        all: "unset",
        cursor: "pointer",
        color: "var(--color-mode-current-accent)",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        maxWidth: "160px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "inline-block",
        verticalAlign: "bottom",
      }}
    >
      {label}
    </button>
  );
}

export interface InspectorEdgeProps {
  edge_id: EdgeRef;
  on_navigate_to_node: (node_id: NodeRef) => void;
}

export function InspectorEdge(props: InspectorEdgeProps): ReactElement {
  const { edge_id, on_navigate_to_node } = props;
  const edge = useFrameStore((s) => s.frame_version?.edges.find((e) => e.id === edge_id));
  // Look up display labels so the source/target buttons read as something
  // human, not as truncated UUIDs.
  const nodes = useFrameStore((s) => s.frame_version?.nodes ?? []);
  const { frame_store } = useRepository();

  if (!edge) {
    return (
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        Edge not found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Header */}
      <div
        style={{
          paddingBottom: "var(--space-3)",
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <h3
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
        >
          Edge type
        </h3>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
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
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
        >
          <EndpointButton
            node_id={edge.source as NodeRef}
            label={describeNode(nodes, edge.source as NodeRef)}
            onClick={() => on_navigate_to_node(edge.source as NodeRef)}
          />
          <span aria-hidden="true">→</span>
          <EndpointButton
            node_id={edge.target as NodeRef}
            label={describeNode(nodes, edge.target as NodeRef)}
            onClick={() => on_navigate_to_node(edge.target as NodeRef)}
          />
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
          paddingTop: "var(--space-3)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
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
