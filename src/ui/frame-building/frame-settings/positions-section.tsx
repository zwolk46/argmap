import type { ReactElement } from "react";
import type { Position } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../primitives";

const INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

export function PositionsSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);
  const { frame_store, generateId } = useRepository();

  if (!frame) return null;

  const positions: Position[] = (frame.positions ?? []) as Position[];

  function dispatchPositions(next: Position[]) {
    frame_store.getState().applyPatch({
      kind: "metadata_edited",
      partial: { positions: next },
    });
  }

  function addPosition() {
    // Route through repository's generateId so the UUID polyfill in
    // main.tsx covers Safari < 15.4 instead of throwing here.
    const id = generateId();
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h3
        className="argmap-section-heading"
        style={{ display: "block", marginBottom: "var(--space-1)" }}
      >
        Positions
      </h3>

      {positions.length === 0 && (
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-tertiary)",
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
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--color-surface-pane)",
            borderRadius: "var(--radius-sm)",
            border: "var(--border-hairline) solid var(--color-border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <input
              type="text"
              value={pos.label}
              className="argmap-input"
              style={INPUT_STYLE}
              placeholder="Position label"
              onChange={(e) => updateLabel(pos.id, e.target.value)}
              onBlur={(e) => updateLabel(pos.id, e.target.value.trim() || "Untitled")}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removePosition(pos.id)}
              aria-label={`Remove position "${pos.label}"`}
              style={{ flexShrink: 0 }}
            >
              Remove
            </Button>
          </div>
          <input
            type="text"
            value={pos.description ?? ""}
            className="argmap-input"
            style={INPUT_STYLE}
            placeholder="Description (optional)"
            onChange={(e) => updateDescription(pos.id, e.target.value)}
          />
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={addPosition} style={{ alignSelf: "flex-start" }}>
        + Add position
      </Button>
    </div>
  );
}
