import type { ReactElement, ReactNode } from "react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "./dialog";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirm_label?: string;
  cancel_label?: string;
  confirm_variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirm_label = "Confirm",
  cancel_label = "Cancel",
  confirm_variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  if (!open) return null;
  const confirmBg =
    confirm_variant === "danger"
      ? "var(--color-severity-error)"
      : "var(--color-mode-current-accent)";
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogHeader>{title}</DialogHeader>
      <DialogBody>{children}</DialogBody>
      <DialogFooter>
        <button
          onClick={onCancel}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            background: "var(--color-surface-pane)",
            color: "var(--color-text-secondary)",
            border: "var(--border-thin) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          {cancel_label}
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: "var(--space-2) var(--space-4)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            background: confirmBg,
            color: "var(--color-text-on-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          {confirm_label}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
