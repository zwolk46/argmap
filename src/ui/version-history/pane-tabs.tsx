import type { ReactElement } from "react";
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group";

export type PaneTabValue = "sessions" | "frames";

export interface PaneTabsProps {
  value: PaneTabValue;
  onChange: (next: PaneTabValue) => void;
}

const OPTIONS: ReadonlyArray<{ value: PaneTabValue; label: string }> = [
  { value: "sessions", label: "Sessions" },
  { value: "frames", label: "Frames (read-only)" },
];

export function PaneTabs({ value, onChange }: PaneTabsProps): ReactElement {
  return (
    <div data-testid="version-history-tabs" className="py-2">
      <ToggleGroup
        type="single"
        value={value}
        // Radix ToggleGroup type="single" emits "" on re-click of the active
        // item. Guard against that so a re-click on the active tab is a no-op.
        onValueChange={(next) => {
          if (next === "sessions" || next === "frames") onChange(next);
        }}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label="Version history view"
      >
        {OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            data-testid={`version-history-tab-${opt.value}`}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
