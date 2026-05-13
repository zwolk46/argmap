import * as React from "react";
import type { ReactElement } from "react";
import type { Conclusion, ConclusionDirection, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { FieldAttributionDecoration } from "../field-attribution-decoration";

export interface ConclusionEditorProps {
  node: Conclusion;
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

const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  background: "var(--color-surface-muted, #f3f4f6)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-full, 9999px)",
  fontSize: "var(--font-size-sm, 13px)",
};

const LEGAL_DIRECTION_VALUES = [
  "affirm",
  "reverse",
  "remand",
  "dismiss",
  "favors_plaintiff",
  "favors_defendant",
  "custom",
] as const;

export function ConclusionEditor(props: ConclusionEditorProps): ReactElement {
  const { node } = props;
  const { frame_store } = useRepository();
  const mode = useFrameStore((s) => s.frame?.mode);
  const positions = useFrameStore((s) => s.frame?.positions);
  const [tag_input, setTagInput] = React.useState("");

  function patch(partial: object) {
    frame_store.getState().applyPatch({
      kind: "node_edited",
      node_id: node.id,
      partial: partial as unknown as Partial<Node>,
    });
  }

  function handleDirectionChange(value: string) {
    if (mode === "legal") {
      const dir: ConclusionDirection = {
        kind: "legal",
        value: value as (typeof LEGAL_DIRECTION_VALUES)[number],
      };
      patch({ direction: dir });
    } else {
      const dir: ConclusionDirection = {
        kind: "general",
        position_id: value,
      };
      patch({ direction: dir });
    }
  }

  function removeTag(tag: string) {
    const next = (node.tags ?? []).filter((t) => t !== tag);
    patch({ tags: next });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const next = [...(node.tags ?? []), trimmed];
    patch({ tags: next });
    setTagInput("");
  }

  const currentDirectionValue =
    node.direction.kind === "legal" ? node.direction.value : node.direction.position_id;

  return (
    <div>
      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration node_id={node.id} field_path="statement" label="Statement">
          <textarea
            rows={3}
            style={INPUT_STYLE}
            defaultValue={node.statement}
            onBlur={(e) => patch({ statement: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Direction</label>
        <select
          style={{ ...INPUT_STYLE, resize: undefined, marginTop: "4px" }}
          value={currentDirectionValue}
          onChange={(e) => handleDirectionChange(e.currentTarget.value)}
        >
          {mode === "legal" ? (
            <>
              {LEGAL_DIRECTION_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v.replace(/_/g, " ")}
                </option>
              ))}
            </>
          ) : (
            <>
              <option value="">— Select position —</option>
              {(positions ?? []).map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.label}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <div style={SECTION_STYLE}>
        <FieldAttributionDecoration
          node_id={node.id}
          field_path="reasoning_summary"
          label="Reasoning Summary"
        >
          <textarea
            rows={2}
            style={INPUT_STYLE}
            defaultValue={node.reasoning_summary ?? ""}
            onBlur={(e) => patch({ reasoning_summary: e.currentTarget.value || undefined })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>Tags</label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-1, 4px)",
            marginTop: "4px",
            marginBottom: "4px",
          }}
        >
          {(node.tags ?? []).map((tag) => (
            <span key={tag} style={PILL_STYLE}>
              {tag}
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  color: "inherit",
                }}
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2, 8px)" }}>
          <input
            type="text"
            style={{ ...INPUT_STYLE, resize: undefined, flex: 1 }}
            value={tag_input}
            placeholder="Add tag…"
            onChange={(e) => setTagInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tag_input);
              }
            }}
          />
          <button
            style={{
              padding: "4px 10px",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "var(--radius-sm, 4px)",
              background: "transparent",
              fontSize: "var(--font-size-sm, 13px)",
              cursor: "pointer",
            }}
            onClick={() => addTag(tag_input)}
          >
            Add
          </button>
        </div>
      </div>

      {mode === "legal" && (
        <div style={SECTION_STYLE}>
          <FieldAttributionDecoration node_id={node.id} field_path="remedy" label="Remedy">
            <input
              type="text"
              style={{ ...INPUT_STYLE, resize: undefined }}
              defaultValue={node.remedy ?? ""}
              onBlur={(e) => patch({ remedy: e.currentTarget.value || undefined })}
            />
          </FieldAttributionDecoration>
        </div>
      )}
    </div>
  );
}
