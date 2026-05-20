import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { TypeIcon, humanizeNodeType } from "../../primitives";
import { Button } from "#components/ui/button";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Separator } from "#components/ui/separator";
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
    return <div className="text-sm text-muted-foreground">Node not found.</div>;
  }

  const EditorComponent = NODE_TYPE_EDITORS[node.type] as React.ComponentType<
    React.ComponentProps<(typeof NODE_TYPE_EDITORS)[typeof node.type]>
  >;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3">
        <TypeIcon node_type={node.type} />
        <span className="text-sm font-medium">{humanizeNodeType(node.type)}</span>
      </div>
      <Separator />

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
      <div className="flex flex-col gap-1">
        <Label htmlFor={`notes-${node_id}`}>Notes</Label>
        <Textarea
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
              // Escape should cancel, not save. Reset the textarea to the
              // last committed value before blurring so onBlur sees no
              // change and the patch is a no-op. Without this, Esc and
              // Cmd+Enter were synonyms — surprising in a field that
              // reads as a quick-jot. Cmd+Enter remains the explicit save.
              e.preventDefault();
              const ta = e.currentTarget as HTMLTextAreaElement;
              ta.value = (node as { notes?: string }).notes ?? "";
              ta.blur();
            }
          }}
        />
      </div>

      {/* Options box (A3: per-instance allowed types only) */}
      {PER_INSTANCE_ALLOWED.has(node.type) && (
        <OptionsBoxEditor node={node} edit_mode={edit_mode} on_change_edit_mode={set_edit_mode} />
      )}

      {/* Validation block */}
      <InspectorValidationBlock node_id={node_id} />

      {/* Footer */}
      <Separator className="mt-1" />
      <div>
        <Button
          variant="destructive"
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
