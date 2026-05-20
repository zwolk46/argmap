import type { ReactElement } from "react";
import { useRepository } from "@/state";
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

export interface AutoArrangeFlowProps {
  open: boolean;
  on_close: () => void;
}

export function AutoArrangeFlow({ open, on_close }: AutoArrangeFlowProps): ReactElement {
  const { frame_store } = useRepository();

  function handleConfirm() {
    frame_store.getState().applyPatch({ kind: "presentation_hints_reset_all" });
    on_close();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) on_close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Auto-arrange nodes?</AlertDialogTitle>
          <AlertDialogDescription>
            All manual node positions in the current frame version will be cleared so the canvas can
            re-layout.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={on_close}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Auto-arrange</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
