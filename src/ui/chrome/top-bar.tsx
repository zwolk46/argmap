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
        "sticky top-0 flex h-12 shrink-0 items-center gap-3 px-4",
        "border-b bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm",
        // §9 #15: narrow-viewport reflow. Below 480px we collapse padding,
        // shrink the gap, and let the header itself scroll horizontally so
        // any leftover slop scrolls inside the chrome instead of the page.
        "max-[480px]:gap-1 max-[480px]:overflow-x-auto max-[480px]:px-2",
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
      {/* Secondary slots: title → chips → indicators → buttons. On narrow
          viewports the chips spill first (status decorations the user can
          re-derive from the page body), then indicators, then title.
          The home button, mode toggle, and primary chrome buttons stay
          reachable at all widths. */}
      {slots.title && <div className="min-w-0 flex-1 max-[480px]:hidden">{slots.title}</div>}
      {slots.chips && <div className="flex shrink-0 gap-1 max-[720px]:hidden">{slots.chips}</div>}
      {slots.indicators && (
        <div className="flex shrink-0 gap-2 max-[560px]:hidden">{slots.indicators}</div>
      )}
      {slots.buttons && <div className="flex shrink-0 gap-1">{slots.buttons}</div>}
    </header>
  );
}
