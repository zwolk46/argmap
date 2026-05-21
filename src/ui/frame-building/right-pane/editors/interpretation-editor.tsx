import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Interpretation, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Textarea } from "#components/ui/textarea";
import { Label } from "#components/ui/label";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface InterpretationEditorProps {
  node: Interpretation;
  on_pick_authority: () => void;
}

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
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Text">
        <Textarea
          rows={3}
          defaultValue={node.statement}
          onBlur={(e) => patch({ statement: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>

      {showAuthority && (
        <div className="flex flex-col gap-1">
          <Label>Authority Citation</Label>
          <div>
            <Button variant="ghost" size="sm" onClick={on_pick_authority}>
              <Plus size={12} />
              Cite authority
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
