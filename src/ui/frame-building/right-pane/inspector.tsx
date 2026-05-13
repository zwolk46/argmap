import type { ReactElement } from "react";
import type { NodeRef, EdgeRef } from "@/schema";
import { useFrameStore } from "@/state";
import { InspectorEmpty } from "./inspector-empty";
import { InspectorNode } from "./inspector-node";
import { InspectorEdge } from "./inspector-edge";
import { InspectorMulti } from "./inspector-multi";

export type InspectorSelection =
  | { kind: "empty" }
  | { kind: "node"; node_id: NodeRef }
  | { kind: "edge"; edge_id: EdgeRef }
  | { kind: "multi"; node_ids: ReadonlyArray<NodeRef>; edge_ids: ReadonlyArray<EdgeRef> };

export interface InspectorProps {
  selection: InspectorSelection;
  on_select: (next: InspectorSelection) => void;
  on_request_delete: (node_id: NodeRef) => void;
  on_open_settings: () => void;
}

export function Inspector(props: InspectorProps): ReactElement {
  const { selection, on_select, on_request_delete, on_open_settings } = props;
  const frame_version = useFrameStore((s) => s.frame_version);

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: "var(--color-surface-elevated)",
        padding: "var(--space-4) var(--space-5)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {!frame_version || selection.kind === "empty" ? (
        <InspectorEmpty on_open_settings={on_open_settings} />
      ) : selection.kind === "node" ? (
        <InspectorNode
          node_id={selection.node_id}
          on_request_delete={() => on_request_delete(selection.node_id)}
          on_navigate_to_node={(id) => on_select({ kind: "node", node_id: id })}
        />
      ) : selection.kind === "edge" ? (
        <InspectorEdge
          edge_id={selection.edge_id}
          on_navigate_to_node={(id) => on_select({ kind: "node", node_id: id })}
        />
      ) : (
        <InspectorMulti
          node_ids={selection.node_ids}
          edge_ids={selection.edge_ids}
          on_request_delete_multi={(ids) => {
            if (ids.length > 0) on_request_delete(ids[0]);
          }}
        />
      )}
    </div>
  );
}
