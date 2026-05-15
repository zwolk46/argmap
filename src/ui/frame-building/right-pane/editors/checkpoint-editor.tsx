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
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface CheckpointEditorProps {
  node: Checkpoint;
  on_pick_option_target: (option_id: string) => void;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const INPUT_STYLE: React.CSSProperties = {
  resize: "vertical",
};

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
            className="argmap-input"
            style={INPUT_STYLE}
            defaultValue={node.question}
            onBlur={(e) => patch({ question: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Answer Type</label>
        <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
          {/* KEEP RAW: pill-toggles for answer-type selection, not the standard Button taxonomy. */}
          {ANSWER_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              style={{
                padding: "var(--space-1) 10px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                background:
                  node.answer_type === opt.value ? "var(--color-primary)" : "transparent",
                color:
                  node.answer_type === opt.value
                    ? "var(--color-text-on-accent)"
                    : "var(--color-text)",
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
          <label className="argmap-section-heading">Options</label>
          <div
            style={{
              marginTop: "var(--space-1)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {node.options.map((opt) => (
              <div
                key={opt.id}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <input
                  type="text"
                  className="argmap-input"
                  style={{ flex: 1 }}
                  defaultValue={opt.label}
                  onBlur={(e) => updateOption(opt.id, { label: e.currentTarget.value })}
                  placeholder="Option label"
                />
                {opt.target_node_id ? (
                  <span style={CHIP_STYLE}>
                    <span>{opt.target_node_id}</span>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => on_pick_option_target(opt.id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    + Target
                  </Button>
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
                gap: "var(--space-2)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                defaultChecked={node.requires_authority}
                onChange={(e) => patch({ requires_authority: e.currentTarget.checked })}
              />
              <span className="argmap-section-heading">Requires Authority</span>
            </label>
          </div>

          <div style={SECTION_STYLE}>
            <label className="argmap-section-heading">Burden Level</label>
            <select
              className="argmap-input"
              style={{ marginTop: "var(--space-1)" }}
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
