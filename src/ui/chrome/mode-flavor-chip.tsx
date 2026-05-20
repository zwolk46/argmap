import type { ReactElement } from "react";
import type { Mode as FrameMode, Flavor as FrameFlavor, Jurisdiction } from "@/schema";
import { Pill } from "../primitives/pill";

export interface ModeFlavorChipProps {
  mode: FrameMode;
  flavor?: FrameFlavor;
  /**
   * Optional jurisdiction surfaced in the secondary slot for legal-mode
   * frames; helps practitioners recognize at a glance whether they're in
   * the right court's frame.
   */
  jurisdiction?: Jurisdiction;
  onOpenSettings?: () => void;
}

export function ModeFlavorChip({
  mode,
  flavor,
  jurisdiction,
  onOpenSettings,
}: ModeFlavorChipProps): ReactElement {
  const primary = mode === "legal" ? "Legal" : "General";
  // Do NOT fabricate a flavor when one isn't set: legal-mode never carries a
  // flavor, and a general-mode frame may also be flavor-less (the wizard
  // defaults to "personal" today, but the schema marks Frame.flavor as
  // optional, so historical rows or imported frames may omit it).
  // §9 #17: legal-mode chip carries jurisdiction info (court/state if set)
  // since flavor is N/A in legal — keeps the secondary slot meaningful.
  const secondary =
    mode === "legal"
      ? (jurisdiction?.court ?? jurisdiction?.region ?? undefined)
      : flavor === "personal"
        ? "Personal"
        : flavor === "academic"
          ? "Academic"
          : undefined;

  const label = secondary ? `${primary} · ${secondary}` : primary;
  const content = (
    <span
      data-mode={mode}
      data-flavor={flavor}
      className="inline-flex items-center gap-1 uppercase tracking-wider font-medium"
    >
      <span>{primary}</span>
      {secondary ? (
        <>
          <span aria-hidden className="opacity-55 mx-px">
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
      data-mode={mode}
      data-flavor={flavor}
      className="cursor-pointer rounded-full bg-transparent border-0 p-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Pill variant="neutral" size="xs">
        {content}
      </Pill>
    </button>
  );
}
