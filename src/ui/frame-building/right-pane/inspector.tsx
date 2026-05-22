import * as React from "react";
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
  /**
   * Click-to-focus callback. Called from any node-reference chip in the
   * editors (logical-gate slots, term linked_to, checkpoint option target,
   * inspector-edge endpoints). Should both update the selection AND
   * center the canvas viewport on the target node so the user can see the
   * spatial location, not just the logical reference. If omitted, the
   * Inspector falls back to plain select-only navigation.
   */
  on_navigate_to_node?: (node_id: NodeRef) => void;
}

export function Inspector(props: InspectorProps): ReactElement {
  const { selection, on_select, on_request_delete, on_open_settings, on_navigate_to_node } = props;
  const frame_version = useFrameStore((s) => s.frame_version);
  // When the page wires a `on_navigate_to_node` (the dev usually does — it
  // calls `setSelection` AND `canvas_ref.current.zoomToNode(id)`), use it
  // verbatim. Otherwise fall back to select-only.
  const handle_navigate = React.useMemo(
    () => (id: NodeRef) => {
      if (on_navigate_to_node) on_navigate_to_node(id);
      else on_select({ kind: "node", node_id: id });
    },
    [on_navigate_to_node, on_select],
  );

  return (
    <div className="h-full overflow-auto bg-card px-5 py-4">
      {!frame_version || selection.kind === "empty" ? (
        <InspectorEmpty on_open_settings={on_open_settings} />
      ) : selection.kind === "node" ? (
        // P1: key by node_id so React remounts InspectorNode on selection
        // change. The textareas inside use `defaultValue` (uncontrolled);
        // remounting flushes uncommitted in-flight edits AND eliminates
        // the "previous node's text appears in the new node's textarea"
        // hazard where React reused the same DOM input.
        <InspectorNode
          key={selection.node_id}
          node_id={selection.node_id}
          on_request_delete={() => on_request_delete(selection.node_id)}
          on_navigate_to_node={handle_navigate}
        />
      ) : selection.kind === "edge" ? (
        <InspectorEdge edge_id={selection.edge_id} on_navigate_to_node={handle_navigate} />
      ) : (
        <InspectorMulti
          node_ids={selection.node_ids}
          edge_ids={selection.edge_ids}
          on_request_delete_multi={(ids) => {
            // P1: route every selected node through the cascade-confirmation
            // flow in id order, rather than dropping all but the first.
            // The cascade dialog handles each id sequentially because the
            // hook holds one pending request at a time; the user will see
            // a confirmation per node, in lex order. (A future
            // batched-cascade UX would consolidate these into one summary;
            // for now this is strictly correct vs the previous "lose all
            // but the first" silent bug.)
            for (const id of ids) on_request_delete(id);
          }}
        />
      )}
    </div>
  );
}
