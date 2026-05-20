import type { ReactElement } from "react";
import type { SubQuestion, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Input } from "#components/ui/input";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { Checkbox } from "#components/ui/checkbox";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface SubQuestionEditorProps {
  node: SubQuestion;
}

export function SubQuestionEditor(props: SubQuestionEditorProps): ReactElement {
  const { node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Question">
        <Textarea
          rows={3}
          defaultValue={node.statement}
          onBlur={(e) => patch({ statement: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>
      {mode === "legal" && (
        <>
          <Label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              defaultChecked={node.is_jurisdictional}
              onCheckedChange={(checked) => patch({ is_jurisdictional: checked === true })}
            />
            <span>Jurisdictional</span>
          </Label>
          <FieldAttributionDecoration
            node_id={node.id}
            field_path="standard_of_review"
            label="Standard of Review"
          >
            <Input
              type="text"
              list="sor-options-sub"
              defaultValue={node.standard_of_review ?? ""}
              onBlur={(e) => patch({ standard_of_review: e.currentTarget.value || undefined })}
            />
            <datalist id="sor-options-sub">
              <option value="de novo" />
              <option value="abuse of discretion" />
              <option value="clear error" />
              <option value="substantial evidence" />
              <option value="preponderance of the evidence" />
              <option value="clear and convincing evidence" />
              <option value="beyond a reasonable doubt" />
            </datalist>
          </FieldAttributionDecoration>
        </>
      )}
    </div>
  );
}
