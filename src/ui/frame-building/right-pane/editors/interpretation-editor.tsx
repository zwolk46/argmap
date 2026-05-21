import * as React from "react";
import type { ReactElement } from "react";
import type { Interpretation, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface InterpretationEditorProps {
  node: Interpretation;
  on_pick_authority: (authority_id: string) => void;
  available_authorities?: Array<{ id: string; label: string }>;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const INPUT_STYLE: React.CSSProperties = {
  resize: "vertical",
};

export function InterpretationEditor(props: InterpretationEditorProps): ReactElement {
  const { node, on_pick_authority, available_authorities = [] } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const flavor = useFrameStore((s) => s.frame?.flavor);
  const [picking_authority, set_picking_authority] = React.useState(false);

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
            {picking_authority ? (
              <select
                className="argmap-input"
                autoFocus
                defaultValue=""
                onChange={(e) => {
                  if (e.currentTarget.value) {
                    on_pick_authority(e.currentTarget.value);
                    set_picking_authority(false);
                  }
                }}
                onBlur={() => set_picking_authority(false)}
              >
                <option value="" disabled>
                  Select an authority…
                </option>
                {available_authorities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => set_picking_authority(true)}>
                + Cite authority
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
