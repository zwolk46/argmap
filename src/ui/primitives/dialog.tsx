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

  // Three-phase mount state. "open" while visible, "exiting" while the
  // close animation plays, "closed" when unmounted. We need the
  // intermediate "exiting" so the overlay + panel get a chance to fade
  // out rather than vanishing — production apps with abrupt unmounts
  // read as cheap.
  const [phase, setPhase] = React.useState<"open" | "exiting" | "closed">(open ? "open" : "closed");
  const exit_timer_ref = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (open) {
      if (exit_timer_ref.current !== null) {
        clearTimeout(exit_timer_ref.current);
        exit_timer_ref.current = null;
      }
      setPhase("open");
    } else if (phase !== "closed") {
      setPhase("exiting");
      // 160ms matches argmap-overlay-fade-out duration below. We use a
      // timer instead of onAnimationEnd because the listener can miss
      // when the consumer unmounts during the exit (React may reorder
      // events around state updates).
      exit_timer_ref.current = setTimeout(() => {
        setPhase("closed");
        exit_timer_ref.current = null;
      }, 160);
    }
  }, [open, phase]);

  React.useEffect(() => {
    return () => {
      if (exit_timer_ref.current !== null) clearTimeout(exit_timer_ref.current);
    };
  }, []);

  // §13 #12: include ARIA-role focusables (role="button" divs, role="radio"
  // cards, role="menuitem", role="tab") in the focus-trap selector. Previously
  // the bare HTML element list left those un-trappable.
  const FOCUSABLE_SELECTOR =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]),' +
    ' [role="button"], [role="radio"], [role="menuitem"], [role="tab"]';

  React.useEffect(() => {
    if (phase === "open") {
      previousFocusRef.current = document.activeElement;
      const focusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      // §13 #13: if zero focusables, focus the dialog element itself so Tab
      // doesn't escape into the obscured background.
      if (focusable) {
        focusable.focus();
      } else if (dialogRef.current) {
        dialogRef.current.tabIndex = -1;
        dialogRef.current.focus();
      }
      document.body.style.overflow = "hidden";
    } else if (phase === "closed") {
      document.body.style.overflow = "";
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
    return () => {
      if (phase === "closed") document.body.style.overflow = "";
    };
  }, [phase]);

  React.useEffect(() => {
    if (phase !== "open") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && dismiss_on_escape) onClose();
      if (e.key === "Tab" && dialogRef.current) {
        // Re-query on each Tab so async DOM updates (toasts, lazy-mounted
        // form fields) are included in the trap.
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (!focusables.length) {
          // No focusables → swallow Tab so it can't fall into the background.
          e.preventDefault();
          return;
        }
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
  }, [phase, onClose, dismiss_on_escape]);

  if (phase === "closed") return null;

  const exiting = phase === "exiting";

  return (
    <div
      className={`argmap-overlay ${exiting ? "argmap-overlay--exiting" : ""}`}
      data-state={phase}
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
        dismiss_on_click_outside && !exiting
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
        className={`argmap-dialog ${exiting ? "argmap-dialog--exiting" : ""}`}
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
