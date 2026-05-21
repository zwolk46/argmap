import type { ReactElement } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Position } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";

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
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Positions
      </h3>

      {positions.length === 0 && (
        <div className="text-sm italic text-muted-foreground/80">
          No positions defined. Add one to assign argument stances.
        </div>
      )}

      {positions.map((pos) => (
        <div
          key={pos.id}
          className="flex flex-col gap-2 rounded-md border border-border bg-muted p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={pos.label}
              className="min-w-0 flex-1"
              placeholder="Position label"
              onChange={(e) => updateLabel(pos.id, e.target.value)}
              onBlur={(e) => updateLabel(pos.id, e.target.value.trim() || "Untitled")}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removePosition(pos.id)}
              aria-label={`Remove position "${pos.label}"`}
              className="shrink-0"
            >
              Remove
            </Button>
          </div>
          <Input
            type="text"
            value={pos.description ?? ""}
            className="min-w-0 flex-1"
            placeholder="Description (optional)"
            onChange={(e) => updateDescription(pos.id, e.target.value)}
          />
        </div>
      ))}

      <Button variant="ghost" size="sm" onClick={addPosition} className="self-start">
        <Plus size={12} />
        Add position
      </Button>
    </div>
  );
}
