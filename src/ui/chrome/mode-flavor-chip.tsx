import type { ReactElement } from "react";
import type { Mode as FrameMode, Flavor as FrameFlavor } from "@/schema";
import { Pill } from "../primitives/pill";

export interface ModeFlavorChipProps {
  mode: FrameMode;
  flavor?: FrameFlavor;
  onOpenSettings?: () => void;
}

export function ModeFlavorChip({
  mode,
  flavor,
  onOpenSettings,
}: ModeFlavorChipProps): ReactElement {
  const primary = mode === "legal" ? "Legal" : "General";
  const secondary = mode === "legal" ? undefined : flavor === "personal" ? "Personal" : "Academic";

  return (
    <Pill variant="neutral" size="xs" title={onOpenSettings ? "Open frame settings" : undefined}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          cursor: onOpenSettings ? "pointer" : "default",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wide)",
          fontWeight: "var(--font-weight-medium)",
        }}
        onClick={onOpenSettings}
      >
        <span>{primary}</span>
        {secondary ? (
          <>
            <span
              aria-hidden
              style={{
                opacity: 0.55,
                marginInline: "1px",
              }}
            >
              ·
            </span>
            <span>{secondary}</span>
          </>
        ) : null}
      </span>
    </Pill>
  );
}
