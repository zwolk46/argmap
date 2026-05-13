import * as React from "react";
import type { ReactElement } from "react";
import type { Interpretation, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface InterpretationEditorProps {
  node: Interpretation;
  on_pick_authority: () => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3, 12px)" };

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  boxSizing: "border-box",
  fontFamily: "inherit",
  resize: "vertical",
};

const LABEL_STYLE: React.CSSProperties = {
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px dashed var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  background: "transparent",
  color: "var(--color-text-secondary, #6b7280)",
  fontSize: "var(--font-size-sm, 13px)",
  cursor: "pointer",
};

export function InterpretationEditor(props: InterpretationEditorProps): ReactElement {
  const { node, on_pick_authority } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const flavor = useFrameStore((s) => s.frame?.flavor);

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  const showAuthority = mode === "legal" || flavor === "academic";

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Text">
          <textarea
            rows={3}
            style={INPUT_STYLE}
            defaultValue={node.statement}
            onBlur={(e) => patch({ statement: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      {showAuthority && (
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Authority Citation</label>
          <div style={{ marginTop: "4px" }}>
            <button style={BUTTON_STYLE} onClick={on_pick_authority}>
              + Cite authority
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
