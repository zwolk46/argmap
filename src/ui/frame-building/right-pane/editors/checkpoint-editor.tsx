import * as React from "react";
import type { ReactElement } from "react";
import type {
  Checkpoint,
  CheckpointAnswerType,
  CheckpointOption,
  BurdenLevel,
  Node,
} from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface CheckpointEditorProps {
  node: Checkpoint;
  on_pick_option_target: (option_id: string) => void;
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
  resize: "vertical",
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

const ANSWER_TYPE_OPTIONS: { value: CheckpointAnswerType; label: string }[] = [
  { value: "boolean", label: "Yes / No" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "graded", label: "Graded" },
];

const BURDEN_LEVELS: { value: BurdenLevel; label: string }[] = [
  { value: "preponderance", label: "Preponderance of the Evidence" },
  { value: "clear_and_convincing", label: "Clear and Convincing" },
  { value: "beyond_reasonable_doubt", label: "Beyond a Reasonable Doubt" },
  { value: "scintilla", label: "Scintilla" },
  { value: "substantial_evidence", label: "Substantial Evidence" },
];

export function CheckpointEditor(props: CheckpointEditorProps): ReactElement {
  const { node, on_pick_option_target } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  function updateOption(option_id: string, updated: Partial<CheckpointOption>) {
    const next_options = node.options.map((o) => (o.id === option_id ? { ...o, ...updated } : o));
    patch({ options: next_options });
  }

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="question" label="Question">
          <textarea
            rows={3}
            style={INPUT_STYLE}
            defaultValue={node.question}
            onBlur={(e) => patch({ question: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Answer Type</label>
        <div style={{ display: "flex", gap: "var(--space-1, 4px)", marginTop: "4px" }}>
          {ANSWER_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              style={{
                padding: "4px 10px",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "var(--radius-sm, 4px)",
                fontSize: "var(--font-size-sm, 13px)",
                cursor: "pointer",
                background:
                  node.answer_type === opt.value ? "var(--color-primary, #2563eb)" : "transparent",
                color: node.answer_type === opt.value ? "#fff" : "var(--color-text, #111827)",
              }}
              onClick={() => patch({ answer_type: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(node.answer_type === "multiple_choice" || node.answer_type === "graded") && (
        <div style={SECTION_STYLE}>
          <label style={LABEL_STYLE}>Options</label>
          <div
            style={{
              marginTop: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2, 8px)",
            }}
          >
            {node.options.map((opt) => (
              <div
                key={opt.id}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}
              >
                <input
                  type="text"
                  style={{ ...INPUT_STYLE, resize: undefined, flex: 1 }}
                  defaultValue={opt.label}
                  onBlur={(e) => updateOption(opt.id, { label: e.currentTarget.value })}
                  placeholder="Option label"
                />
                {opt.target_node_id ? (
                  <span style={CHIP_STYLE}>
                    <span>{opt.target_node_id}</span>
                  </span>
                ) : (
                  <button
                    style={{
                      padding: "2px 8px",
                      border: "1px dashed var(--color-border, #e5e7eb)",
                      borderRadius: "var(--radius-sm, 4px)",
                      background: "transparent",
                      color: "var(--color-text-secondary, #6b7280)",
                      fontSize: "var(--font-size-sm, 13px)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => on_pick_option_target(opt.id)}
                  >
                    + Target
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "legal" && (
        <>
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
                defaultChecked={node.requires_authority}
                onChange={(e) => patch({ requires_authority: e.currentTarget.checked })}
              />
              <span style={LABEL_STYLE}>Requires Authority</span>
            </label>
          </div>

          <div style={SECTION_STYLE}>
            <label style={LABEL_STYLE}>Burden Level</label>
            <select
              style={{ ...INPUT_STYLE, resize: undefined, marginTop: "4px" }}
              defaultValue={node.burden_level ?? ""}
              onChange={(e) =>
                patch({
                  burden_level: (e.currentTarget.value || undefined) as BurdenLevel | undefined,
                })
              }
            >
              <option value="">— None —</option>
              {BURDEN_LEVELS.map((bl) => (
                <option key={bl.value} value={bl.value}>
                  {bl.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
