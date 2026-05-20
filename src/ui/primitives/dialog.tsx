import type { ReactElement, ReactNode } from "react";
import { Dialog as ShDialog, DialogContent, DialogTitle } from "#components/ui/dialog";
import { cn } from "#lib/utils";

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

// shadcn's DialogContent defaults to ~max-w-md. argmap's argument-running
// modals need a wider canvas; size keeps the existing three-tier escape hatch.
const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[720px]",
};

export function DialogHeader({
  children,
  id,
}: {
  children: ReactNode;
  /** Set this and pass the same value as `aria_labelledby` on the Dialog so
   *  SRs announce the visible title. The id is forwarded to the Radix
   *  DialogTitle so the dialog is auto-labelled even when no explicit
   *  aria-labelledby is supplied (Radix requires a Title or fires a
   *  console warning). */
  id?: string;
}): ReactElement {
  return (
    <DialogTitle
      id={id}
      data-slot="argmap-dialog-header"
      className="px-5 py-4 border-b text-lg font-semibold text-[var(--color-text-primary)] tracking-tight"
    >
      {children}
    </DialogTitle>
  );
}

export function DialogBody({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      data-slot="argmap-dialog-body"
      className="px-5 py-4 text-sm text-[var(--color-text-secondary)] leading-normal overflow-y-auto flex-1 min-h-0"
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children }: { children: ReactNode }): ReactElement {
  return (
    <div data-slot="argmap-dialog-footer" className="px-5 py-3 border-t flex gap-2 justify-end">
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
  return (
    <ShDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        aria-label={aria_labelledby ? undefined : aria_label}
        aria-labelledby={aria_labelledby}
        // shadcn ships its own close X in the upper-right; suppress since
        // the argmap convention is to use a Cancel button in the footer
        // (every existing dialog renders one) and a stray X would compete
        // for the dismissal affordance.
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          if (!dismiss_on_escape) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!dismiss_on_click_outside) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (!dismiss_on_click_outside) e.preventDefault();
        }}
        className={cn(
          // Override shadcn's padding/gap defaults; the argmap dialog is
          // composed of Header/Body/Footer panels that own their own padding.
          "p-0 gap-0 max-h-[calc(100vh-var(--space-8,2rem))] flex flex-col",
          SIZE_CLASS[size],
        )}
      >
        {children}
      </DialogContent>
    </ShDialog>
  );
}
