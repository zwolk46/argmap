import * as React from "react";
import type { ReactElement } from "react";
import type { Position } from "@/schema";

export interface PositionsInlineEditorProps {
  staged_positions: Position[];
  onPositionStaged: (position: Position) => void;
  onPositionRemoved: (position_id: string) => void;
  generateId: () => string;
}

export function PositionsInlineEditor(props: PositionsInlineEditorProps): ReactElement {
  const [draft, setDraft] = React.useState("");

  function commitDraft(): void {
    const trimmed = draft.trim();
    if (!trimmed) return;
    props.onPositionStaged({ id: props.generateId(), label: trimmed });
    setDraft("");
  }

  return (
    <div
      data-testid="positions-inline-editor"
      style={{
        marginTop: "var(--space-3, 12px)",
        padding: "var(--space-3, 12px)",
        background: "var(--color-status-not-applicable-bg, #f3f4f6)",
        borderRadius: "var(--radius-md, 6px)",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          marginBottom: "var(--space-2, 8px)",
        }}
      >
        Required: define at least one position
      </div>
      {props.staged_positions.map((p) => (
        <div
          key={p.id}
          data-testid="staged-position-row"
          style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}
        >
          <span style={{ fontSize: "var(--font-size-sm, 13px)" }}>{p.label}</span>
          <button
            type="button"
            data-testid="remove-staged-position"
            onClick={() => props.onPositionRemoved(p.id)}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      ))}
      <div
        style={{ display: "flex", gap: "var(--space-2, 8px)", marginTop: "var(--space-2, 8px)" }}
      >
        <input
          type="text"
          data-testid="position-draft-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Position label"
          style={{
            flex: 1,
            padding: "var(--space-1, 4px) var(--space-2, 8px)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        />
        <button
          type="button"
          data-testid="position-add-button"
          onClick={commitDraft}
          disabled={!draft.trim()}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
