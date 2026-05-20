import type { ReactElement, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { cn } from "#lib/utils";
import type { DialogSize } from "./dialog";

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

// Map argmap dialog sizes to shadcn AlertDialogContent's two-tier size axis.
// argmap's `lg` doesn't have a direct shadcn equivalent here so we widen via
// a className override.
const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

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
  const danger = destructive || confirm_variant === "danger";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent className={cn(SIZE_CLASS[size])}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{children}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancel_label}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirm_disabled}
            variant={danger ? "destructive" : "default"}
            className={
              danger
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirm_label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
