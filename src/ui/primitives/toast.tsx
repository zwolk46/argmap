import type { ReactElement, ReactNode } from "react";
import { toast as sonner, Toaster } from "sonner";

/**
 * Toast primitive — backed by sonner under the new shadcn design system.
 * Surfaces non-blocking transient notifications.
 *
 * Surface contract (unchanged from the legacy hand-rolled implementation):
 *   - <ToastProvider> is mounted once near the App root.
 *   - useToast() returns push(toast) and dismiss(id).
 *   - Toasts auto-dismiss after `duration_ms` (default 6000ms) unless the
 *     caller passes `duration_ms: 0` to make them sticky.
 *   - Kinds: "error" | "warning" | "info" | "success".
 *
 * sonner exposes `toast()` as a singleton, so `useToast` no longer needs a
 * real Provider/Context. The Provider component still ships <Toaster /> at
 * the app root and renders `children` so callers don't have to change.
 */

export type ToastKind = "error" | "warning" | "info" | "success";

export interface ToastInput {
  kind: ToastKind;
  message: string;
  /** Auto-dismiss timeout in ms; 0 disables auto-dismiss. Default 6000. */
  duration_ms?: number;
}

interface ToastContextValue {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

export interface ToastProviderProps {
  children: ReactNode;
}

function push(toast: ToastInput): string {
  // sonner's `toast.<kind>` returns a `number | string` id; we coerce to
  // string for compatibility with the legacy contract.
  // `duration: Infinity` makes the toast sticky (sonner's convention for
  // "never auto-dismiss"); the legacy contract used 0 for the same effect.
  const duration =
    toast.duration_ms === undefined ? 6000 : toast.duration_ms === 0 ? Infinity : toast.duration_ms;
  const opts = { duration };
  let id: number | string;
  switch (toast.kind) {
    case "error":
      id = sonner.error(toast.message, opts);
      break;
    case "warning":
      id = sonner.warning(toast.message, opts);
      break;
    case "success":
      id = sonner.success(toast.message, opts);
      break;
    default:
      id = sonner.info(toast.message, opts);
      break;
  }
  return String(id);
}

function dismiss(id: string): void {
  // sonner accepts either a string or number id and tolerates unknowns.
  sonner.dismiss(id);
}

const TOAST_API: ToastContextValue = { push, dismiss };

export function ToastProvider({ children }: ToastProviderProps): ReactElement {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          // Translate sonner's stock kinds into argmap data-testids so
          // surface-level assertions (toast-error etc.) keep working.
          classNames: {
            toast: "cn-toast",
          },
        }}
      />
    </>
  );
}

export function useToast(): ToastContextValue {
  return TOAST_API;
}

// Variant for primitives that may render in isolated test harnesses without
// a ToastProvider mounted. Since sonner's `toast()` is a singleton, this
// can always return the API safely — no fallback-to-null needed — but the
// legacy export shape is preserved so existing callers compile.
export function useOptionalToast(): ToastContextValue | null {
  return TOAST_API;
}
