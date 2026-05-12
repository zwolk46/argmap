import * as React from "react";
import type { ReactElement, ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  dismiss_on_escape?: boolean;
  width?: string;
  children: ReactNode;
}

export function DrawerHeader({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        fontSize: "var(--font-size-md)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}

export function DrawerBody({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-5)",
        overflowY: "auto",
        flex: 1,
      }}
    >
      {children}
    </div>
  );
}

export function DrawerFooter({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-3) var(--space-5)",
        borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        display: "flex",
        gap: "var(--space-2)",
        justifyContent: "flex-end",
      }}
    >
      {children}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  dismiss_on_escape = true,
  width = "360px",
  children,
}: DrawerProps): ReactElement | null {
  React.useEffect(() => {
    if (!open || !dismiss_on_escape) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, dismiss_on_escape, onClose]);

  return (
    <div
      data-testid="drawer"
      data-open={open}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width,
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: `transform var(--duration-medium) var(--ease-emphasized)`,
        zIndex: 100,
      }}
    >
      {children}
    </div>
  );
}
