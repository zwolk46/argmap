import type { ReactElement, ReactNode } from "react";
import { Z } from "../primitives";
import { cn } from "#lib/utils";

export interface TopBarSlots {
  home?: ReactNode;
  modeToggle?: ReactNode;
  title?: ReactNode;
  chips?: ReactNode;
  indicators?: ReactNode;
  buttons?: ReactNode;
}

export interface TopBarProps {
  slots: TopBarSlots;
  mode?: "frame-building" | "argument-running";
}

export function TopBar({ slots, mode = "frame-building" }: TopBarProps): ReactElement {
  return (
    <header
      data-mode={mode}
      className={cn(
        "argmap-topbar sticky top-0 flex h-12 items-center gap-3 px-4",
        "bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm border-b",
        "shrink-0",
      )}
      style={{
        zIndex: Z.topbar,
        // Webkit-prefixed backdrop-filter for Safari, which still requires it
        // on some versions even when the unprefixed property is set via the
        // Tailwind class.
        WebkitBackdropFilter: "saturate(120%) blur(2px)",
      }}
    >
      {slots.home && <div className="shrink-0">{slots.home}</div>}
      {slots.modeToggle && <div className="shrink-0">{slots.modeToggle}</div>}
      {slots.title && <div className="argmap-topbar-title flex-1 min-w-0">{slots.title}</div>}
      {/* Secondary slots: chips → indicators → buttons. On narrow viewports
          the title can compress to 0 before these spill horizontally, so
          we hide the chips first (they're status decorations the user can
          re-derive from the page body), then indicators. The home button,
          mode toggle, and primary chrome buttons stay reachable at all
          widths via .argmap-topbar-* breakpoints in global.css. */}
      {slots.chips && <div className="argmap-topbar-chips flex gap-1 shrink-0">{slots.chips}</div>}
      {slots.indicators && (
        <div className="argmap-topbar-indicators flex gap-2 shrink-0">{slots.indicators}</div>
      )}
      {slots.buttons && <div className="flex gap-1 shrink-0">{slots.buttons}</div>}
    </header>
  );
}
