import type { ReactElement, ReactNode } from "react";

export interface TopBarSlots {
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
        borderBottom: "var(--border-thin) solid var(--color-mode-current-accent)",
        flexShrink: 0,
        transition: `border-color var(--duration-slow) var(--ease-standard)`,
      }}
    >
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
