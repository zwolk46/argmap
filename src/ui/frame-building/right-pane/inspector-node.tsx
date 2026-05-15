import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button, TypeIcon, humanizeNodeType } from "../../primitives";
import { InspectorValidationBlock } from "./inspector-validation-block";
import { NODE_TYPE_EDITORS } from "./editors";
import { OptionsBoxEditor } from "./options-box-editor";

const PER_INSTANCE_ALLOWED: ReadonlySet<Node["type"]> = new Set([
  "Checkpoint",
  "RootQuestion",
  "SubQuestion",
  "Interpretation",
]);

export interface InspectorNodeProps {
  node_id: NodeRef;
  on_request_delete: () => void;
  on_navigate_to_node: (node_id: NodeRef) => void;
}

export function InspectorNode(props: InspectorNodeProps): ReactElement {
  const { node_id, on_request_delete, on_navigate_to_node } = props;
  const node = useFrameStore((s) => s.frame_version?.nodes.find((n) => n.id === node_id));
  const { frame_store } = useRepository();
  const [edit_mode, set_edit_mode] = useEditMode(node);

  if (!node) {
    return (
      <div
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        Node not found.
      </div>
    );
  }

  const EditorComponent = NODE_TYPE_EDITORS[node.type] as React.ComponentType<
    React.ComponentProps<(typeof NODE_TYPE_EDITORS)[typeof node.type]>
  >;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          paddingBottom: "var(--space-3)",
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
          marginBottom: "var(--space-3)",
        }}
      >
        <TypeIcon node_type={node.type} />
        <span
          style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}
        >
          {humanizeNodeType(node.type)}
        </span>
      </div>

      {/* Per-node-type editor */}
      <EditorComponent
        node={node}
        on_navigate_to_node={on_navigate_to_node}
        on_pick_linked_to={() => {}}
        on_pick_authority={() => {}}
        on_pick_option_target={() => {}}
        on_pick_slot_source={() => {}}
        on_pick_binding_in_jurisdiction={() => {}}
      />

      {/* Notes */}
      <div style={{ marginTop: "var(--space-3)" }}>
        <label
          className="argmap-section-heading"
          style={{ display: "block", marginBottom: "var(--space-1)" }}
          htmlFor={`notes-${node_id}`}
        >
          Notes
        </label>
        <textarea
          id={`notes-${node_id}`}
          rows={2}
          defaultValue={(node as { notes?: string }).notes ?? ""}
          placeholder="Add notes…"
          onBlur={(e) => {
            frame_store.getState().applyPatch({
              kind: "node_edited",
              node_id,
              partial: { notes: e.currentTarget.value } as Partial<Node>,
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
          style={TEXTAREA_STYLE}
        />
      </div>

      {/* Options box (A3: per-instance allowed types only) */}
      {PER_INSTANCE_ALLOWED.has(node.type) && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <OptionsBoxEditor node={node} edit_mode={edit_mode} on_change_edit_mode={set_edit_mode} />
        </div>
      )}

      {/* Validation block */}
      <InspectorValidationBlock node_id={node_id} />

      {/* Footer */}
      <div
        style={{
          marginTop: "var(--space-4)",
          paddingTop: "var(--space-3)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <Button
          variant="destructive"
          size="md"
          disabled={node.type === "RootQuestion"}
          title={
            node.type === "RootQuestion"
              ? "Cannot delete the Root Question (V-FR-1)"
              : "Delete node"
          }
          onClick={on_request_delete}
        >
          Delete node
        </Button>
      </div>
    </div>
  );
}

function useEditMode(
  node: Node | undefined,
): ["instance" | "frame_default", (m: "instance" | "frame_default") => void] {
  const has_instance = !!(node as { options_box?: unknown } | undefined)?.options_box;
  const [mode, setMode] = React.useState<"instance" | "frame_default">(
    has_instance ? "instance" : "frame_default",
  );
  // P1: reset edit_mode when the selected node changes; the initial
  // useState was previously evaluated only once and the toggle stuck on
  // the first-selected node's state even after switching to a node with
  // a different options_box presence.
  const last_node_id_ref = React.useRef<string | undefined>(node?.id);
  React.useEffect(() => {
    if (node?.id !== last_node_id_ref.current) {
      last_node_id_ref.current = node?.id;
      setMode(has_instance ? "instance" : "frame_default");
    }
  }, [node?.id, has_instance]);
  return [mode, setMode];
}

const TEXTAREA_STYLE: React.CSSProperties = {
  resize: "vertical",
};
