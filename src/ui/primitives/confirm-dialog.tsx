import type { ReactElement, ReactNode } from "react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "./dialog";
import type { DialogSize } from "./dialog";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirm_label?: string;
  cancel_label?: string;
  confirm_variant?: "primary" | "danger";
  /** Show a destructive treatment (e.g., delete). Same as `confirm_variant="danger"` plus subtle copy hints. */
  destructive?: boolean;
  confirm_disabled?: boolean;
  size?: DialogSize;
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
  destructive,
  confirm_disabled,
  size = "sm",
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement | null {
  if (!open) return null;
  const variant =
    destructive || confirm_variant === "danger" ? "destructive-solid" : "primary";
  return (
    <Dialog open={open} onClose={onCancel} aria_label={title} size={size}>
      <DialogHeader>{title}</DialogHeader>
      <DialogBody>{children}</DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          {cancel_label}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={confirm_disabled}>
          {confirm_label}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
