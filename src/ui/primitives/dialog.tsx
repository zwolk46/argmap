import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Z } from "./z-index";

export type DialogSize = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  aria_label?: string;
  /**
   * ID of an element (typically the DialogHeader's visible title) that names
   * the dialog. Preferred over `aria_label` when a visible title exists —
   * SRs announce the title verbatim and sighted/AT users hear the same name.
   * If both are supplied, `aria_labelledby` wins.
   */
  aria_labelledby?: string;
  dismiss_on_click_outside?: boolean;
  dismiss_on_escape?: boolean;
  size?: DialogSize;
  children: ReactNode;
}

const DIALOG_MAX_WIDTH: Record<DialogSize, string> = {
  sm: "400px",
  md: "560px",
  lg: "720px",
};

export function DialogHeader({
  children,
  id,
}: {
  children: ReactNode;
  /** Set this and pass the same value as `aria_labelledby` on the Dialog so
   *  SRs announce the visible title. */
  id?: string;
}): ReactElement {
  return (
    <div
      id={id}
      style={{
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        // Dialog headings sit at the "lg" tier of the heading scale.
        // Page-level headings (sign-in title, welcome screen) use xl;
        // dialogs (wizard, mode-change, confirm) use lg; section headings
        // inside a panel use sm via .argmap-section-heading. Keeping these
        // tiers consistent is what makes the app feel like one product.
        fontSize: "var(--font-size-lg)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-primary)",
        letterSpacing: "var(--letter-spacing-tight)",
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
        overflowY: "auto",
        flex: 1,
        minHeight: 0,
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
  aria_labelledby,
  dismiss_on_click_outside = true,
  dismiss_on_escape = true,
  size = "md",
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
      if (e.key === "Escape" && dismiss_on_escape) onClose();
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
  }, [open, onClose, dismiss_on_escape]);

  if (!open) return null;

  return (
    <div
      className="argmap-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z.modal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
        background: "var(--color-surface-overlay)",
      }}
      onClick={
        dismiss_on_click_outside
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={aria_labelledby}
        aria-label={aria_labelledby ? undefined : aria_label}
        className="argmap-dialog"
        style={{
          background: "var(--color-surface-elevated)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          border: "var(--border-hairline) solid var(--color-border-subtle)",
          minWidth: "320px",
          maxWidth: DIALOG_MAX_WIDTH[size],
          width: "100%",
          maxHeight: "calc(100vh - var(--space-8))",
          display: "flex",
          flexDirection: "column",
          outline: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
