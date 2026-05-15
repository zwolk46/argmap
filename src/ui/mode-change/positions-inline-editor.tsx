import * as React from "react";
import type { ReactElement } from "react";
import type { Position } from "@/schema";
import { Button } from "../primitives";

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
          {/* KEEP RAW: tiny inline × glyph in a staged-position row; bespoke micro-control. */}
          <button
            type="button"
            data-testid="remove-staged-position"
            onClick={() => props.onPositionRemoved(p.id)}
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
            aria-label={`Remove staged position ${p.label}`}
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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder="Position label"
          className="argmap-input"
          style={{ flex: 1 }}
        />
        <Button
          variant="ghost"
          size="sm"
          data-testid="position-add-button"
          onClick={commitDraft}
          disabled={!draft.trim()}
        >
          + Add
        </Button>
      </div>
    </div>
  );
}
