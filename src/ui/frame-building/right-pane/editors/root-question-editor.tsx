import * as React from "react";
import type { ReactElement } from "react";
import type { RootQuestion, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface RootQuestionEditorProps {
  node: RootQuestion;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const INPUT_STYLE: React.CSSProperties = {
  resize: "vertical",
};

export function RootQuestionEditor(props: RootQuestionEditorProps): ReactElement {
  const { node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Question">
          <textarea
            rows={3}
            className="argmap-input"
            style={INPUT_STYLE}
            defaultValue={node.statement}
            onBlur={(e) => patch({ statement: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>
      {mode === "legal" && (
        <div style={SECTION_STYLE}>
          <FieldAttributionDecoration
            node_id={node.id}
            field_path="standard_of_review"
            label="Standard of Review"
          >
            <input
              type="text"
              className="argmap-input"
              list="sor-options"
              defaultValue={node.standard_of_review ?? ""}
              onBlur={(e) => patch({ standard_of_review: e.currentTarget.value || undefined })}
            />
            <datalist id="sor-options">
              <option value="de novo" />
              <option value="abuse of discretion" />
              <option value="clear error" />
              <option value="substantial evidence" />
              <option value="preponderance of the evidence" />
              <option value="clear and convincing evidence" />
              <option value="beyond a reasonable doubt" />
            </datalist>
          </FieldAttributionDecoration>
        </div>
      )}
    </div>
  );
}
