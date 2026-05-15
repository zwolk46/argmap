import type { ReactElement, ReactNode } from "react";
import { Z } from "../primitives";

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
      style={{
        height: "48px",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "0 var(--space-4)",
        background: "var(--color-surface-elevated)",
        // Neutral hairline instead of mode-accent. The mode is communicated
        // by the ModeFlavorChip and the toggle — repeating it as the page
        // top border felt over-emphasized and broke the chrome's neutrality
        // (Linear / Notion / Vercel all use a single neutral hairline).
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        flexShrink: 0,
        // Anchored to the viewport top so scroll-context inside the page
        // body doesn't lose the chrome.
        position: "sticky",
        top: 0,
        zIndex: Z.topbar,
        backdropFilter: "saturate(120%) blur(2px)",
      }}
    >
      {slots.home && <div style={{ flexShrink: 0 }}>{slots.home}</div>}
      {slots.modeToggle && <div style={{ flexShrink: 0 }}>{slots.modeToggle}</div>}
      {slots.title && <div style={{ flex: 1, minWidth: 0 }}>{slots.title}</div>}
      {slots.chips && (
        <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>{slots.chips}</div>
      )}
      {slots.indicators && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          {slots.indicators}
        </div>
      )}
      {slots.buttons && (
        <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>{slots.buttons}</div>
      )}
    </header>
  );
}
