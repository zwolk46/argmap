import * as React from "react";
import type { ReactElement } from "react";
import type { LogicalGate } from "@/schema";

export interface LogicalGateEditorProps {
  node: LogicalGate;
  on_pick_slot_source: (slot: string, current_value: string | undefined) => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3, 12px)" };

const LABEL_STYLE: React.CSSProperties = {
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
};

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  background: "var(--color-primary-subtle, #eff6ff)",
  color: "var(--color-primary, #2563eb)",
  borderRadius: "var(--radius-full, 9999px)",
  fontSize: "var(--font-size-sm, 13px)",
};

const SLOT_BUTTON_STYLE: React.CSSProperties = {
  padding: "2px 8px",
  border: "1px dashed var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  background: "transparent",
  color: "var(--color-text-secondary, #6b7280)",
  fontSize: "var(--font-size-sm, 13px)",
  cursor: "pointer",
};

const GATE_TYPE_BADGE: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 10px",
  background: "var(--color-surface-muted, #f3f4f6)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  fontWeight: 600,
  letterSpacing: "0.05em",
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
      <span style={{ ...LABEL_STYLE, minWidth: 80 }}>{label}</span>
      {value ? (
        <span style={CHIP_STYLE}>{value}</span>
      ) : (
        <button style={SLOT_BUTTON_STYLE} onClick={() => on_pick(slot, value)}>
          + Pick
        </button>
      )}
      {value && (
        <button style={SLOT_BUTTON_STYLE} onClick={() => on_pick(slot, value)}>
          Change
        </button>
      )}
    </div>
  );
}

export function LogicalGateEditor(props: LogicalGateEditorProps): ReactElement {
  const { node, on_pick_slot_source } = props;

  return (
    <div>
      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Gate Type</label>
        <div style={{ marginTop: "4px" }}>
          <span style={GATE_TYPE_BADGE}>{node.gate_type}</span>
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Inputs</label>
        <div style={{ marginTop: "4px" }}>
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
              <button
                style={SLOT_BUTTON_STYLE}
                onClick={() => on_pick_slot_source(`inputs.${node.inputs.length}`, undefined)}
              >
                + Add input
              </button>
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
