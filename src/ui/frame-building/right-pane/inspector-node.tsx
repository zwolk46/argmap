import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { TypeIcon, humanizeNodeType } from "../../primitives";
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
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
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
          gap: "var(--space-2, 8px)",
          paddingBottom: "var(--space-3, 12px)",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          marginBottom: "var(--space-3, 12px)",
        }}
      >
        <TypeIcon node_type={node.type} />
        <span style={{ fontSize: "var(--font-size-sm, 13px)", fontWeight: 500 }}>
          {humanizeNodeType(node.type)}
        </span>
        {import.meta.env.DEV && (
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-tertiary, #9ca3af)",
            }}
          >
            #{node_id.slice(0, 8)}
          </span>
        )}
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
      <div style={{ marginTop: "var(--space-3, 12px)" }}>
        <label style={LABEL_STYLE} htmlFor={`notes-${node_id}`}>
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
          style={TEXTAREA_STYLE}
        />
      </div>

      {/* Options box (A3: per-instance allowed types only) */}
      {PER_INSTANCE_ALLOWED.has(node.type) && (
        <div style={{ marginTop: "var(--space-3, 12px)" }}>
          <OptionsBoxEditor node={node} edit_mode={edit_mode} on_change_edit_mode={set_edit_mode} />
        </div>
      )}

      {/* Validation block */}
      <InspectorValidationBlock node_id={node_id} />

      {/* Footer */}
      <div
        style={{
          marginTop: "var(--space-4, 16px)",
          paddingTop: "var(--space-3, 12px)",
          borderTop: "1px solid var(--color-border, #e5e7eb)",
        }}
      >
        <button
          type="button"
          disabled={node.type === "RootQuestion"}
          title={
            node.type === "RootQuestion"
              ? "Cannot delete the Root Question (V-FR-1)"
              : "Delete node"
          }
          onClick={on_request_delete}
          style={{
            padding: "6px 12px",
            background:
              node.type === "RootQuestion" ? "transparent" : "var(--color-danger-subtle, #fef2f2)",
            color:
              node.type === "RootQuestion"
                ? "var(--color-text-tertiary, #9ca3af)"
                : "var(--color-danger, #dc2626)",
            border: "1px solid",
            borderColor:
              node.type === "RootQuestion"
                ? "var(--color-border, #e5e7eb)"
                : "var(--color-danger-border, #fca5a5)",
            borderRadius: "var(--radius-sm, 4px)",
            cursor: node.type === "RootQuestion" ? "not-allowed" : "pointer",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        >
          Delete node
        </button>
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

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
  marginBottom: "4px",
};

const TEXTAREA_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  resize: "vertical",
  fontFamily: "inherit",
};
