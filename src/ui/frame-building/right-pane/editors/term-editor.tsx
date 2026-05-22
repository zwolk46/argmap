import * as React from "react";
import type { ReactElement } from "react";
import { Plus, X } from "@phosphor-icons/react";
import type { Term, Node, NodeRef } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { NodeChip } from "../../../primitives";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import { Checkbox } from "#components/ui/checkbox";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface TermEditorProps {
  node: Term;
  available_terms?: Array<{ id: string; label: string }>;
  on_navigate_to_node?: (node_id: NodeRef) => void;
}

export function TermEditor(props: TermEditorProps): ReactElement {
  const { node, available_terms = [], on_navigate_to_node } = props;
  const frame_version_nodes = useFrameStore((s) => s.frame_version?.nodes ?? []);
  const { frame_store } = useRepository();
  const [picking_link, set_picking_link] = React.useState(false);

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
          {node.linked_to && !picking_link ? (
            <span className="inline-flex items-center gap-2">
              <NodeChip
                node_id={node.linked_to as NodeRef}
                nodes={frame_version_nodes}
                on_navigate={on_navigate_to_node}
                max_chars={42}
              />
              <Button variant="ghost" size="sm" onClick={() => set_picking_link(true)}>
                Change
              </Button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-primary/20"
                onClick={() => patch({ linked_to: undefined })}
                aria-label="Clear link"
              >
                <X size={12} />
              </button>
            </span>
          ) : picking_link ? (
            <select
              className="argmap-input"
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (e.currentTarget.value) {
                  patch({ linked_to: e.currentTarget.value });
                  set_picking_link(false);
                }
              }}
              onBlur={() => set_picking_link(false)}
            >
              <option value="" disabled>
                Select a Term node…
              </option>
              {available_terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => set_picking_link(true)}>
              <Plus size={12} />
              Link node
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
