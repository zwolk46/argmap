import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { LogicalGate } from "@/schema";
import { humanizeGateType } from "../../../primitives";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";

export interface LogicalGateEditorProps {
  node: LogicalGate;
  on_pick_slot_source: (slot: string, current_value: string | undefined) => void;
}

function SlotRow({
  label,
  slot,
  value,
  on_pick,
}: {
  label: string;
  slot: string;
  value: string | undefined;
  on_pick: (slot: string, current: string | undefined) => void;
}): ReactElement {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="min-w-20 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {value ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">
          {value}
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => on_pick(slot, value)}>
          <Plus size={12} />
          Pick
        </Button>
      )}
      {value && (
        <Button variant="ghost" size="sm" onClick={() => on_pick(slot, value)}>
          Change
        </Button>
      )}
    </div>
  );
}

export function LogicalGateEditor(props: LogicalGateEditorProps): ReactElement {
  const { node, on_pick_slot_source } = props;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Gate Type</Label>
        <div>
          <span
            className="inline-block rounded-md border border-border bg-muted px-2.5 py-0.5 text-sm font-semibold tracking-wide"
            title={node.gate_type}
          >
            {humanizeGateType(node.gate_type)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Inputs</Label>
        <div>
          {(node.gate_type === "AND" || node.gate_type === "OR") && (
            <>
              {node.inputs.map((ref, i) => (
                <SlotRow
                  key={i}
                  label={`Input ${i + 1}`}
                  slot={`inputs.${i}`}
                  value={ref}
                  on_pick={(slot, current) => on_pick_slot_source(slot, current)}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => on_pick_slot_source(`inputs.${node.inputs.length}`, undefined)}
              >
                <Plus size={12} />
                Add input
              </Button>
            </>
          )}

          {node.gate_type === "NOT" && (
            <SlotRow
              label="Input"
              slot="input"
              value={node.input}
              on_pick={(slot, current) => on_pick_slot_source(slot, current)}
            />
          )}

          {node.gate_type === "IF_THEN" && (
            <>
              <SlotRow
                label="Antecedent"
                slot="antecedent"
                value={node.antecedent}
                on_pick={(slot, current) => on_pick_slot_source(slot, current)}
              />
              <SlotRow
                label="Consequent"
                slot="consequent"
                value={node.consequent}
                on_pick={(slot, current) => on_pick_slot_source(slot, current)}
              />
            </>
          )}

          {node.gate_type === "UNLESS" && (
            <>
              <SlotRow
                label="Main"
                slot="main"
                value={node.main}
                on_pick={(slot, current) => on_pick_slot_source(slot, current)}
              />
              <SlotRow
                label="Exception"
                slot="exception"
                value={node.exception}
                on_pick={(slot, current) => on_pick_slot_source(slot, current)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
