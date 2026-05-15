import * as React from "react";
import type { ReactElement } from "react";
import type { LogicalGate } from "@/schema";
import { Button, humanizeGateType } from "../../../primitives";

export interface LogicalGateEditorProps {
  node: LogicalGate;
  on_pick_slot_source: (slot: string, current_value: string | undefined) => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3, 12px)" };

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "2px var(--space-2)",
  background: "var(--color-primary-subtle, #eff6ff)",
  color: "var(--color-primary, #2563eb)",
  borderRadius: "var(--radius-full, 9999px)",
  fontSize: "var(--font-size-sm, 13px)",
};

const GATE_TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  background: "var(--color-surface-muted, #f3f4f6)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  fontWeight: "var(--font-weight-semibold)",
  letterSpacing: "var(--letter-spacing-wide)",
};

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        marginBottom: "var(--space-2, 8px)",
      }}
    >
      <span className="argmap-section-heading" style={{ minWidth: 80 }}>
        {label}
      </span>
      {value ? (
        <span style={CHIP_STYLE}>{value}</span>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => on_pick(slot, value)}>
          + Pick
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
    <div>
      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Gate Type</label>
        <div style={{ marginTop: "var(--space-1)" }}>
          <span style={GATE_TYPE_BADGE} title={node.gate_type}>
            {humanizeGateType(node.gate_type)}
          </span>
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Inputs</label>
        <div style={{ marginTop: "var(--space-1)" }}>
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
                + Add input
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
