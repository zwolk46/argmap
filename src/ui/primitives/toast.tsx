import * as React from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Minimal toast primitive. Surfaces non-blocking transient notifications.
 *
 * Why this exists in Wave A (P0-22): the frame and session stores set
 * `error: string` when an autosave save_failed event fires, but the only UI
 * consumer of those fields was CanvasEmptyState, gated on `!frame_version`.
 * After a frame loads, every subsequent `QuotaExceededError` or
 * `RepositoryError` was written into state and silently swallowed — the
 * user's edits continued to fail to persist with no feedback.
 *
 * Surface contract:
 *   - <ToastProvider> is mounted once near the App root.
 *   - useToast() returns push(toast) and dismiss(id).
 *   - Toasts auto-dismiss after `duration_ms` (default 6000ms) unless the
 *     caller passes `duration_ms: 0` to make them sticky.
 *   - Kinds: "error" | "warning" | "info" | "success". Errors get role="alert".
 */

export type ToastKind = "error" | "warning" | "info" | "success";

export interface ToastInput {
  kind: ToastKind;
  message: string;
  /** Auto-dismiss timeout in ms; 0 disables auto-dismiss. Default 6000. */
  duration_ms?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let _toast_id_counter = 0;

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): ReactElement {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = React.useCallback(
    (toast: ToastInput): string => {
      const id = `toast-${++_toast_id_counter}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      const ms = toast.duration_ms ?? 6000;
      if (ms > 0) {
        const handle = setTimeout(() => dismiss(id), ms);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  React.useEffect(() => {
    // Snapshot the ref'd Map at effect-mount time so the cleanup closes over
    // the same instance the effect ran with (react-hooks/exhaustive-deps).
    const live_timers = timers.current;
    return () => {
      for (const t of live_timers.values()) clearTimeout(t);
      live_timers.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

interface ToastStackProps {
  toasts: ReadonlyArray<ToastRecord>;
  onDismiss: (id: string) => void;
}

function ToastStack({ toasts, onDismiss }: ToastStackProps): ReactElement | null {
  if (toasts.length === 0) return null;
  return (
    <div
      data-testid="toast-stack"
      style={{
        position: "fixed",
        bottom: "var(--space-4, 16px)",
        right: "var(--space-4, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2, 8px)",
        zIndex: 1000,
        maxWidth: "calc(100vw - var(--space-8, 32px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const KIND_STYLES: Record<ToastKind, { fg: string; bg: string; stripe: string }> = {
  error: {
    fg: "var(--color-text-on-severity-error, #b91c1c)",
    bg: "var(--color-severity-error-bg, #fee2e2)",
    stripe: "var(--color-severity-error, #dc2626)",
  },
  warning: {
    fg: "var(--color-text-on-severity-warning, #92400e)",
    bg: "var(--color-severity-warning-bg, #fef3c7)",
    stripe: "var(--color-severity-warning, #d97706)",
  },
  info: {
    fg: "var(--color-text-primary, #111827)",
    bg: "var(--color-background-secondary, #f3f4f6)",
    stripe: "var(--color-border-secondary, #d1d5db)",
  },
  success: {
    fg: "var(--color-text-success, #065f46)",
    bg: "var(--color-background-success, #d1fae5)",
    stripe: "var(--color-text-success, #10b981)",
  },
};

interface ToastItemProps {
  toast: ToastRecord;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): ReactElement {
  const styles = KIND_STYLES[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      data-testid={`toast-${toast.kind}`}
      style={{
        background: styles.bg,
        color: styles.fg,
        padding: "var(--space-3, 12px) var(--space-4, 16px)",
        borderRadius: "var(--border-radius-md, 6px)",
        borderLeft: `var(--border-thick, 3px) solid ${styles.stripe}`,
        fontSize: "var(--font-size-sm, 13px)",
        lineHeight: "var(--line-height-normal, 1.5)",
        boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3, 12px)",
        pointerEvents: "auto",
        minWidth: 280,
        maxWidth: 480,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: styles.fg,
          opacity: 0.7,
          fontSize: "var(--font-size-base, 14px)",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
