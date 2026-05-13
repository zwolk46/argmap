import type { ReactElement } from "react";
import type { ConclusionDirection, Position } from "@/schema";
import type { ConclusionDirectionEditor } from "@/state";

export interface ConclusionDirectionEditorRowProps {
  editor: ConclusionDirectionEditor;
  conclusion_title: string;
  current_value: ConclusionDirection | undefined;
  onValueChanged: (value: ConclusionDirection) => void;
  available_positions?: Position[];
}

export function ConclusionDirectionEditorRow(
  props: ConclusionDirectionEditorRowProps,
): ReactElement {
  const { editor, conclusion_title, current_value, onValueChanged, available_positions } = props;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const v = e.target.value;
    if (!v) return;
    if (editor.required_direction_kind === "legal") {
      onValueChanged({
        kind: "legal",
        value: v as Extract<ConclusionDirection, { kind: "legal" }>["value"],
      });
    } else {
      onValueChanged({ kind: "general", position_id: v });
    }
  }

  const selected =
    current_value?.kind === "legal"
      ? current_value.value
      : current_value?.kind === "general"
        ? current_value.position_id
        : "";

  // Resolve option label for general mode using available_positions when present.
  const optionLabel = (opt: { value: string; label: string }): string => {
    if (editor.required_direction_kind === "general" && available_positions) {
      const p = available_positions.find((pos) => pos.id === opt.value);
      if (p) return p.label;
    }
    return opt.label;
  };

  return (
    <div
      data-testid="conclusion-direction-editor-row"
      data-node-id={editor.node_id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        padding: "var(--space-2, 8px) var(--space-3, 12px)",
        borderLeft: "2px solid var(--color-severity-error, #dc2626)",
        marginBottom: "var(--space-1, 4px)",
      }}
    >
      <span style={{ flex: 1, fontSize: "var(--font-size-sm, 13px)", fontWeight: 500 }}>
        {conclusion_title}
      </span>
      <span
        data-testid="current-kind-chip"
        style={{
          fontSize: "var(--font-size-2xs, 10px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        {editor.current_direction_kind} → {editor.required_direction_kind}
      </span>
      <select
        data-testid="direction-select"
        value={selected}
        onChange={handleChange}
        style={{ fontSize: "var(--font-size-sm, 13px)" }}
      >
        <option value="">Pick {editor.required_direction_kind} direction</option>
        {editor.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {optionLabel(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}
