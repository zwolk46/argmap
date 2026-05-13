import * as React from "react";
import type { NodeRef } from "@/schema";
import { useSessionStore } from "@/state";
import { CheckpointItemEditor } from "./checkpoint-item-editor";
import { TermItemEditor } from "./term-item-editor";
import { InterpretationItemEditor } from "./interpretation-item-editor";

export interface ItemEditorHostProps {
  selected_item_id: NodeRef;
  on_close: () => void;
  on_saved: () => void;
}

export const ITEM_EDITOR_REGISTRY = {
  Checkpoint: CheckpointItemEditor,
  Term: TermItemEditor,
  Interpretation: InterpretationItemEditor,
} as const;

export function ItemEditorHost(props: ItemEditorHostProps): React.ReactElement | null {
  const { selected_item_id, on_close, on_saved } = props;
  const node = useSessionStore(
    (s) => s.session?.frame_version_snapshot.nodes.find((n) => n.id === selected_item_id) ?? null,
  );

  React.useEffect(() => {
    function on_keydown(e: KeyboardEvent): void {
      if (e.key === "Escape") on_close();
    }
    window.addEventListener("keydown", on_keydown);
    return () => window.removeEventListener("keydown", on_keydown);
  }, [on_close]);

  if (!node) return null;

  if (node.type === "Checkpoint") {
    return <CheckpointItemEditor node={node} on_close={on_close} on_saved={on_saved} />;
  }
  if (node.type === "Term") {
    return <TermItemEditor node={node} on_close={on_close} on_saved={on_saved} />;
  }
  if (node.type === "Interpretation") {
    return <InterpretationItemEditor node={node} on_close={on_close} on_saved={on_saved} />;
  }
  return (
    <div
      data-testid="item-editor-unsupported"
      style={{ padding: "var(--space-3, 12px)", fontSize: "var(--font-size-xs, 11px)" }}
    >
      No editor for node type: {node.type}
    </div>
  );
}
