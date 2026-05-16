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
  // Do NOT fabricate a flavor when one isn't set: legal-mode never carries a
  // flavor, and a general-mode frame may also be flavor-less (the wizard
  // defaults to "personal" today, but the schema marks Frame.flavor as
  // optional, so historical rows or imported frames may omit it).
  const secondary =
    mode === "legal"
      ? undefined
      : flavor === "personal"
        ? "Personal"
        : flavor === "academic"
          ? "Academic"
          : undefined;

  return (
    <Pill variant="neutral" size="xs" title={onOpenSettings ? "Open frame settings" : undefined}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
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
