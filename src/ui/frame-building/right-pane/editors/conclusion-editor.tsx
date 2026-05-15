import * as React from "react";
import type { ReactElement } from "react";
import type { Conclusion, ConclusionDirection, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../../primitives";
import { FieldAttributionDecoration } from "../field-attribution-decoration";
import { UIcon } from "../../../primitives/uicon";

export interface ConclusionEditorProps {
  node: Conclusion;
}

const SECTION_STYLE: React.CSSProperties = { marginBottom: "var(--space-3)" };

const INPUT_STYLE: React.CSSProperties = {
  resize: "vertical",
};

const PILL_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "2px var(--space-2)",
  background: "var(--color-surface-muted)",
  border: "var(--border-hairline) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-full)",
  fontSize: "var(--font-size-sm)",
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
            className="argmap-input"
            style={INPUT_STYLE}
            defaultValue={node.statement}
            onBlur={(e) => patch({ statement: e.currentTarget.value })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Direction</label>
        <select
          className="argmap-input"
          style={{ marginTop: "var(--space-1)" }}
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
            className="argmap-input"
            style={INPUT_STYLE}
            defaultValue={node.reasoning_summary ?? ""}
            onBlur={(e) => patch({ reasoning_summary: e.currentTarget.value || undefined })}
          />
        </FieldAttributionDecoration>
      </div>

      <div style={SECTION_STYLE}>
        <label className="argmap-section-heading">Tags</label>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-1)",
            marginTop: "var(--space-1)",
            marginBottom: "var(--space-1)",
          }}
        >
          {(node.tags ?? []).map((tag) => (
            <span key={tag} style={PILL_STYLE}>
              {tag}
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
                }}
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <UIcon name="times" size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            type="text"
            className="argmap-input"
            style={{ flex: 1 }}
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
          <Button variant="secondary" size="sm" onClick={() => addTag(tag_input)}>
            Add
          </Button>
        </div>
      </div>

      {mode === "legal" && (
        <div style={SECTION_STYLE}>
          <FieldAttributionDecoration node_id={node.id} field_path="remedy" label="Remedy">
            <input
              type="text"
              className="argmap-input"
              defaultValue={node.remedy ?? ""}
              onBlur={(e) => patch({ remedy: e.currentTarget.value || undefined })}
            />
          </FieldAttributionDecoration>
        </div>
      )}
    </div>
  );
}
