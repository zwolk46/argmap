import * as React from "react";
import type { ReactElement } from "react";
import type { Term, Node } from "@/schema";
import { useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface TermEditorProps {
  node: Term;
  on_pick_linked_to: () => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3, 12px)" };

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-sm, 13px)",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

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

const BUTTON_STYLE: React.CSSProperties = {
  padding: "4px 10px",
  border: "1px dashed var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  background: "transparent",
  color: "var(--color-text-secondary, #6b7280)",
  fontSize: "var(--font-size-sm, 13px)",
  cursor: "pointer",
};

export function TermEditor(props: TermEditorProps): ReactElement {
  const { node, on_pick_linked_to } = props;
  const { frame_store } = useRepository();

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="name" label="Name">
          <input
            type="text"
            style={INPUT_STYLE}
            defaultValue={node.name}
            onBlur={(e) => patch({ name: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Order</label>
        <input
          type="number"
          style={{ ...INPUT_STYLE, marginTop: "4px" }}
          defaultValue={node.order}
          min={0}
          onBlur={(e) => {
            const val = parseInt(e.currentTarget.value, 10);
            if (!isNaN(val)) patch({ order: val });
          }}
        />
      </div>

      <div style={SECTION_STYLE}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2, 8px)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            defaultChecked={node.dispositive}
            onChange={(e) => patch({ dispositive: e.currentTarget.checked })}
          />
          <span style={LABEL_STYLE}>Dispositive</span>
        </label>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Linked To</label>
        <div style={{ marginTop: "4px" }}>
          {node.linked_to ? (
            <span style={CHIP_STYLE}>
              <span>{node.linked_to}</span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  color: "inherit",
                }}
                onClick={() => patch({ linked_to: undefined })}
                aria-label="Clear link"
              >
                ×
              </button>
            </span>
          ) : (
            <button style={BUTTON_STYLE} onClick={on_pick_linked_to}>
              + Link node
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
