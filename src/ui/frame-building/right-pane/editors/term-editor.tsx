import * as React from "react";
import type { ReactElement } from "react";
import type { Term, Node } from "@/schema";
import { useRepository } from "@/state";
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface TermEditorProps {
  node: Term;
  available_terms?: Array<{ id: string; label: string }>;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "2px var(--space-2)",
  background: "var(--color-primary-subtle)",
  color: "var(--color-primary)",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-size-sm)",
};

export function TermEditor(props: TermEditorProps): ReactElement {
  const { node, available_terms = [] } = props;
  const { frame_store } = useRepository();
  const [picking_link, set_picking_link] = React.useState(false);

  function patch(partial: Partial<Node>) {
    frame_store.getState().applyPatch({ kind: "node_edited", node_id: node.id, partial });
  }

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="name" label="Name">
          <input
            type="text"
            className="argmap-input"
            defaultValue={node.name}
            onBlur={(e) => patch({ name: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Order</label>
        <input
          type="number"
          className="argmap-input"
          style={{ marginTop: "var(--space-1)" }}
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
            gap: "var(--space-2)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            defaultChecked={node.dispositive}
            onChange={(e) => patch({ dispositive: e.currentTarget.checked })}
          />
          <span className="argmap-section-heading">Dispositive</span>
        </label>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Linked To</label>
        <div style={{ marginTop: "var(--space-1)" }}>
          {node.linked_to && !picking_link ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={CHIP_STYLE}>{node.linked_to}</span>
              <Button variant="ghost" size="sm" onClick={() => set_picking_link(true)}>
                Change
              </Button>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "var(--space-1)",
                  margin: "calc(var(--space-1) * -1)",
                  lineHeight: 1,
                  color: "inherit",
                  borderRadius: "var(--radius-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-sm)",
                }}
                onClick={() => patch({ linked_to: undefined })}
                aria-label="Clear link"
              >
                ×
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
              + Link node
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
