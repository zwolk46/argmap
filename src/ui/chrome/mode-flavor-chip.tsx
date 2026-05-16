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

  const label = secondary ? `${primary} · ${secondary}` : primary;
  const content = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        textTransform: "uppercase",
        letterSpacing: "var(--letter-spacing-wide)",
        fontWeight: "var(--font-weight-medium)",
      }}
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
  );
  if (!onOpenSettings) {
    return (
      <Pill variant="neutral" size="xs">
        {content}
      </Pill>
    );
  }
  // When the chip opens settings, render the interactive surface as a real
  // <button> so keyboard users can activate it (the prior onClick on a span
  // had no role / tabIndex / keydown handler).
  return (
    <button
      type="button"
      onClick={onOpenSettings}
      title="Open frame settings"
      aria-label={`Frame mode: ${label}. Open frame settings.`}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "inline-block",
        borderRadius: "var(--radius-pill)",
      }}
    >
      <Pill variant="neutral" size="xs">
        {content}
      </Pill>
    </button>
  );
}
