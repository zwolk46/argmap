import type { ReactElement } from "react";
import { useRepository } from "@/state";
import { ConfirmDialog } from "../../primitives";

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
    <ConfirmDialog
      open={open}
      title="Auto-arrange nodes?"
      confirm_label="Auto-arrange"
      onConfirm={handleConfirm}
      onCancel={on_close}
    >
      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        All manual node positions in the current frame version will be cleared so the canvas can
        re-layout.
      </p>
    </ConfirmDialog>
  );
}
