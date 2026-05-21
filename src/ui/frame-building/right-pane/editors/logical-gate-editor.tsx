import * as React from "react";
import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { GateType, LogicalGate, Node } from "@/schema";
import { useRepository } from "@/state";
import { humanizeGateType } from "../../../primitives";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";

export interface LogicalGateEditorProps {
  node: LogicalGate;
  available_nodes?: Array<{ id: string; label: string }>;
}

const GATE_TYPES: GateType[] = ["AND", "OR", "NOT", "IF_THEN", "UNLESS"];

function SlotRow({
  label,
  value,
  available_nodes,
  on_pick,
  on_clear,
}: {
  label: string;
  value: string | undefined;
  available_nodes: Array<{ id: string; label: string }>;
  on_pick: (node_id: string) => void;
  on_clear?: () => void;
}): ReactElement {
  const [picking, set_picking] = React.useState(false);

  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="min-w-20 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {value && !picking ? (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-sm text-primary">
            {value}
          </span>
          <Button variant="ghost" size="sm" onClick={() => set_picking(true)}>
            Change
          </Button>
          {on_clear && (
            <Button variant="ghost" size="sm" onClick={on_clear} aria-label="Clear">
              ×
            </Button>
          )}
        </>
      ) : picking ? (
        <select
          className="argmap-input"
          autoFocus
          defaultValue=""
          onChange={(e) => {
            if (e.currentTarget.value) {
              on_pick(e.currentTarget.value);
              set_picking(false);
            }
          }}
          onBlur={() => set_picking(false)}
        >
          <option value="" disabled>
            Select a node…
          </option>
          {available_nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => set_picking(true)}>
          <Plus size={12} />
          Pick
        </Button>
      )}
    </div>
  );
}

export function LogicalGateEditor(props: LogicalGateEditorProps): ReactElement {
  const { node, available_nodes = [] } = props;
  const { frame_store } = useRepository();
  const [adding_input, set_adding_input] = React.useState(false);

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  function pick_slot(slot: string, node_id: string) {
    if (slot.startsWith("inputs.")) {
      const idx = parseInt(slot.split(".")[1], 10);
      const current = node.gate_type === "AND" || node.gate_type === "OR" ? [...node.inputs] : [];
      current[idx] = node_id;
      patch({ inputs: current } as Partial<Node>);
    } else {
      patch({ [slot]: node_id } as Partial<Node>);
    }
  }

  function clear_slot(slot: string) {
    if (slot.startsWith("inputs.")) {
      const idx = parseInt(slot.split(".")[1], 10);
      const current = node.gate_type === "AND" || node.gate_type === "OR" ? [...node.inputs] : [];
      current.splice(idx, 1);
      patch({ inputs: current } as Partial<Node>);
    } else {
      patch({ [slot]: undefined } as Partial<Node>);
    }
  }

  function change_gate_type(new_type: GateType) {
    const base_clear = {
      gate_type: new_type,
      inputs: undefined,
      input: undefined,
      antecedent: undefined,
      consequent: undefined,
      main: undefined,
      exception: undefined,
    } as Partial<Node>;
    if (new_type === "AND" || new_type === "OR") {
      (base_clear as { inputs?: string[] }).inputs = [];
    }
    patch(base_clear);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Gate Type</Label>
        <div>
          <select
            className="argmap-input"
            value={node.gate_type}
            onChange={(e) => change_gate_type(e.currentTarget.value as GateType)}
          >
            {GATE_TYPES.map((gt) => (
              <option key={gt} value={gt}>
                {humanizeGateType(gt)}
              </option>
            ))}
          </select>
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
                  value={ref}
                  available_nodes={available_nodes}
                  on_pick={(node_id) => pick_slot(`inputs.${i}`, node_id)}
                  on_clear={() => clear_slot(`inputs.${i}`)}
                />
              ))}
              {adding_input ? (
                <select
                  className="argmap-input"
                  autoFocus
                  defaultValue=""
                  onChange={(e) => {
                    if (e.currentTarget.value) {
                      pick_slot(`inputs.${node.inputs.length}`, e.currentTarget.value);
                      set_adding_input(false);
                    }
                  }}
                  onBlur={() => set_adding_input(false)}
                >
                  <option value="" disabled>
                    Select a node…
                  </option>
                  {available_nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => set_adding_input(true)}>
                  <Plus size={12} />
                  Add input
                </Button>
              )}
            </>
          )}

          {node.gate_type === "NOT" && (
            <SlotRow
              label="Input"
              value={node.input}
              available_nodes={available_nodes}
              on_pick={(node_id) => pick_slot("input", node_id)}
              on_clear={() => clear_slot("input")}
            />
          )}

          {node.gate_type === "IF_THEN" && (
            <>
              <SlotRow
                label="Antecedent"
                value={node.antecedent}
                available_nodes={available_nodes}
                on_pick={(node_id) => pick_slot("antecedent", node_id)}
                on_clear={() => clear_slot("antecedent")}
              />
              <SlotRow
                label="Consequent"
                value={node.consequent}
                available_nodes={available_nodes}
                on_pick={(node_id) => pick_slot("consequent", node_id)}
                on_clear={() => clear_slot("consequent")}
              />
            </>
          )}

          {node.gate_type === "UNLESS" && (
            <>
              <SlotRow
                label="Main"
                value={node.main}
                available_nodes={available_nodes}
                on_pick={(node_id) => pick_slot("main", node_id)}
                on_clear={() => clear_slot("main")}
              />
              <SlotRow
                label="Exception"
                value={node.exception}
                available_nodes={available_nodes}
                on_pick={(node_id) => pick_slot("exception", node_id)}
                on_clear={() => clear_slot("exception")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
