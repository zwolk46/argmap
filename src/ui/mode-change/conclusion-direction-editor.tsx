import type { ReactElement } from "react";
import type { ConclusionDirection, Position } from "@/schema";
import type { ConclusionDirectionEditor } from "@/state";
import { cn } from "#lib/utils";

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

  // H1: the red error strip should only show while the editor is unresolved.
  // Once the user has picked a value (selected non-empty), shift to a calm
  // success treatment so the row reads as "done" rather than "still wrong".
  const resolved = selected !== "";
  return (
    <div
      data-testid="conclusion-direction-editor-row"
      data-node-id={editor.node_id}
      data-resolved={resolved ? "true" : "false"}
      className={cn("mb-2 flex items-center gap-2 rounded-r-md border-l-[3px] px-3 py-2")}
      style={{
        borderLeftColor: resolved ? "var(--color-status-satisfied)" : "var(--color-severity-error)",
        background: resolved
          ? "var(--color-status-satisfied-bg)"
          : "var(--color-severity-error-bg)",
      }}
    >
      <span className="flex-1 text-sm font-medium text-foreground">{conclusion_title}</span>
      <span
        data-testid="current-kind-chip"
        className="whitespace-nowrap rounded-full px-2 text-[10px] font-medium uppercase tracking-wide"
        style={{
          color: "var(--color-mode-current-accent)",
          background: "var(--color-mode-current-accent-bg)",
        }}
      >
        {editor.current_direction_kind} → {editor.required_direction_kind}
      </span>
      <select
        data-testid="direction-select"
        value={selected}
        onChange={handleChange}
        className="h-8 w-auto min-w-[180px] rounded-md border border-input bg-input/30 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
