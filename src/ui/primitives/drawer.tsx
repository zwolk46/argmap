import * as React from "react";
import type { ReactElement, ReactNode } from "react";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  dismiss_on_escape?: boolean;
  width?: string;
  height?: string;
  side?: DrawerSide;
  aria_label?: string;
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
  height = "260px",
  side = "right",
  aria_label,
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

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    background: "var(--color-surface-elevated)",
    boxShadow: "var(--shadow-md)",
    display: "flex",
    flexDirection: "column",
    transition: "transform var(--duration-medium) var(--ease-emphasized)",
    zIndex: 100,
  };

  let positionalStyle: React.CSSProperties;
  if (side === "right") {
    positionalStyle = {
      top: 0,
      right: 0,
      bottom: 0,
      width,
      borderLeft: "var(--border-hairline) solid var(--color-border-subtle)",
      transform: open ? "translateX(0)" : "translateX(100%)",
    };
  } else if (side === "left") {
    positionalStyle = {
      top: 0,
      left: 0,
      bottom: 0,
      width,
      borderRight: "var(--border-hairline) solid var(--color-border-subtle)",
      transform: open ? "translateX(0)" : "translateX(-100%)",
    };
  } else {
    positionalStyle = {
      left: 0,
      right: 0,
      bottom: 0,
      height,
      borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
      transform: open ? "translateY(0)" : "translateY(100%)",
    };
  }

  // P0-24: when closed, the drawer slides off-screen via transform but its
  // children remain in DOM (so the slide-out animation works). `aria-hidden`
  // alone hides them from screen readers but NOT from the keyboard tab
  // order — sighted keyboard users would Tab into the void and lose focus.
  // The `inert` attribute removes the subtree from both tab order and
  // pointer events while keeping it in the DOM for the transition.
  return (
    <div
      data-testid="drawer"
      data-open={open}
      data-side={side}
      role="dialog"
      aria-label={aria_label}
      aria-hidden={!open}
      // React passes `inert` straight through to the DOM element since
      // React 19 / TS lib.dom; for older typings we coerce.
      {...(!open ? ({ inert: "" } as { inert: string }) : {})}
      style={{ ...baseStyle, ...positionalStyle }}
    >
      {children}
    </div>
  );
}
