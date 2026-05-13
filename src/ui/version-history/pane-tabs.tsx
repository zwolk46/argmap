import type { ReactElement } from "react";
import { SegmentedToggle } from "../primitives";

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
    <div data-testid="version-history-tabs" style={{ padding: "var(--space-2, 8px) 0" }}>
      <SegmentedToggle options={OPTIONS} value={value} onChange={onChange} />
    </div>
  );
}
