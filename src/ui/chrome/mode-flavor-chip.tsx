import type { ReactElement } from "react";
import type { Mode as FrameMode, Flavor as FrameFlavor } from "@/schema";
import { Pill } from "../primitives/pill";

export interface ModeFlavorChipProps {
  mode: FrameMode;
  flavor?: FrameFlavor;
  onOpenSettings?: () => void;
}

export function ModeFlavorChip({ mode, flavor, onOpenSettings }: ModeFlavorChipProps): ReactElement {
  const label =
    mode === "legal"
      ? "legal"
      : flavor === "personal"
        ? "general · personal"
        : "general · academic";

  return (
    <Pill
      size="xs"
      bg="var(--color-surface-pane)"
      color="var(--color-text-secondary)"
    >
      <span
        style={{ cursor: onOpenSettings ? "pointer" : "default" }}
        onClick={onOpenSettings}
      >
        {label}
      </span>
    </Pill>
  );
}
