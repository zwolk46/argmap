import type { ReactElement } from "react";
import { Plus, X } from "@phosphor-icons/react";
import type { Term, Node } from "@/schema";
import { useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Checkbox } from "#components/ui/checkbox";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface TermEditorProps {
  node: Term;
  on_pick_linked_to: () => void;
}

export function TermEditor(props: TermEditorProps): ReactElement {
  const { node, on_pick_linked_to } = props;
  const { frame_store } = useRepository();

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldAttributionDecoration node_id={node.id} field_path="name" label="Name">
        <Input
          type="text"
          defaultValue={node.name}
          onBlur={(e) => patch({ name: e.currentTarget.value })}
        />
      </FieldAttributionDecoration>

      <div className="flex flex-col gap-1">
        <Label>Order</Label>
        <Input
          type="number"
          defaultValue={node.order}
          min={0}
          onBlur={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            if (!isNaN(val)) patch({ order: val });
          }}
        />
      </div>

      <Label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          defaultChecked={node.dispositive}
          onCheckedChange={(checked) => patch({ dispositive: checked === true })}
        />
        <span>Dispositive</span>
      </Label>

      <div className="flex flex-col gap-1">
        <Label>Linked To</Label>
        <div>
          {node.linked_to ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">
              <span>{node.linked_to}</span>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-primary/20"
                onClick={() => patch({ linked_to: undefined })}
                aria-label="Clear link"
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={on_pick_linked_to}>
              <Plus size={12} />
              Link node
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
