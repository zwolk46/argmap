import * as React from "react";
import type { ReactElement, ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  aria_label?: string;
  dismiss_on_click_outside?: boolean;
  children: ReactNode;
}

export function DialogHeader({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        fontSize: "var(--font-size-md)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-primary)",
      }}
    >
      {children}
    </div>
  );
}

export function DialogBody({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-5)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
        lineHeight: "var(--line-height-normal)",
      }}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }): ReactElement {
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

export function Dialog({
  open,
  onClose,
  aria_label,
  dismiss_on_click_outside = true,
  children,
}: DialogProps): ReactElement | null {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<Element | null>(null);

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-surface-overlay)",
      }}
      onClick={dismiss_on_click_outside ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={aria_label}
        style={{
          background: "var(--color-surface-elevated)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          minWidth: "320px",
          maxWidth: "520px",
          width: "100%",
          outline: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
