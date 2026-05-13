import type { ReactElement } from "react";
import type { Position } from "@/schema";
import { useFrameStore, useRepository } from "@/state";

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs, 11px)",
  fontWeight: 600,
  color: "var(--color-text-tertiary, #9ca3af)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: "var(--space-1, 4px)",
};

const INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-1, 4px) var(--space-2, 8px)",
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--color-text-primary, #111827)",
  background: "var(--color-surface-pane, #f9fafb)",
  border: "1px solid var(--color-border-default, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  outline: "none",
  minWidth: 0,
};

export function PositionsSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);
  const { frame_store } = useRepository();

  if (!frame) return null;

  const positions: Position[] = (frame.positions ?? []) as Position[];

  function dispatchPositions(next: Position[]) {
    frame_store.getState().applyPatch({
      kind: "metadata_edited",
      partial: { positions: next },
    });
  }

  function addPosition() {
    const id = crypto.randomUUID();
    dispatchPositions([...positions, { id, label: "New position" }]);
  }

  function removePosition(id: string) {
    dispatchPositions(positions.filter((p) => p.id !== id));
  }

  function updateLabel(id: string, label: string) {
    dispatchPositions(positions.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  function updateDescription(id: string, description: string) {
    dispatchPositions(
      positions.map((p) => (p.id === id ? { ...p, description: description || undefined } : p)),
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      <span style={LABEL_STYLE}>Positions</span>

      {positions.length === 0 && (
        <div
          style={{
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-tertiary, #9ca3af)",
            fontStyle: "italic",
          }}
        >
          No positions defined. Add one to assign argument stances.
        </div>
      )}

      {positions.map((pos) => (
        <div
          key={pos.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2, 8px)",
            padding: "var(--space-3, 12px)",
            background: "var(--color-surface-pane, #f9fafb)",
            borderRadius: "var(--radius-sm, 4px)",
            border: "1px solid var(--color-border-subtle, #f3f4f6)",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}>
            <input
              type="text"
              value={pos.label}
              style={INPUT_STYLE}
              placeholder="Position label"
              onChange={(e) => updateLabel(pos.id, e.target.value)}
              onBlur={(e) => updateLabel(pos.id, e.target.value.trim() || "Untitled")}
            />
            <button
              type="button"
              onClick={() => removePosition(pos.id)}
              aria-label={`Remove position "${pos.label}"`}
              style={{
                padding: "var(--space-1, 4px) var(--space-2, 8px)",
                fontSize: "var(--font-size-xs, 11px)",
                border: "1px solid var(--color-severity-error, #ef4444)",
                borderRadius: "var(--radius-sm, 4px)",
                cursor: "pointer",
                background: "transparent",
                color: "var(--color-severity-error, #ef4444)",
                flexShrink: 0,
              }}
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={pos.description ?? ""}
            style={INPUT_STYLE}
            placeholder="Description (optional)"
            onChange={(e) => updateDescription(pos.id, e.target.value)}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addPosition}
        style={{
          padding: "var(--space-2, 8px) var(--space-3, 12px)",
          fontSize: "var(--font-size-sm, 13px)",
          border: "1px solid var(--color-border-default, #e5e7eb)",
          borderRadius: "var(--radius-sm, 4px)",
          cursor: "pointer",
          background: "var(--color-surface-pane, #f9fafb)",
          color: "var(--color-text-secondary, #6b7280)",
          alignSelf: "flex-start",
        }}
      >
        + Add position
      </button>
    </div>
  );
}
