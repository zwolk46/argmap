import * as React from "react";
import type { ReactElement } from "react";
import type { Interpretation, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface InterpretationEditorProps {
  node: Interpretation;
  on_pick_authority: () => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const INPUT_STYLE: React.CSSProperties = {
  resize: "vertical",
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
            className="argmap-input"
            style={INPUT_STYLE}
            defaultValue={node.statement}
            onBlur={(e) => patch({ statement: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      {showAuthority && (
        <div style={SECTION_STYLE}>
          <label className="argmap-section-heading">Authority Citation</label>
          <div style={{ marginTop: "var(--space-1)" }}>
            <Button variant="ghost" size="sm" onClick={on_pick_authority}>
              + Cite authority
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
