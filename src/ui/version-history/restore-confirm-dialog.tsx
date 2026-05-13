import * as React from "react";
import type { ReactElement } from "react";
import type { FrameVersionId, SessionVersionId } from "@/schema";
import { ConfirmDialog } from "../primitives";
import { useRepository } from "@/state";

export interface RestoreConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  entity_kind: "frame" | "session";
  ancestor_version_id: FrameVersionId | SessionVersionId;
  ancestor_version_number: number;
  current_version_number: number;
  on_restored: () => void;
}

export function RestoreConfirmDialog(props: RestoreConfirmDialogProps): ReactElement | null {
  const {
    open,
    onClose,
    entity_kind,
    ancestor_version_id,
    ancestor_version_number,
    current_version_number,
    on_restored,
  } = props;
  const { frame_store, session_store } = useRepository();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPending(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      if (entity_kind === "frame") {
        await frame_store.getState().restoreVersion(ancestor_version_id as FrameVersionId);
      } else {
        await session_store
          .getState()
          .restoreVersion(ancestor_version_id as SessionVersionId);
      }
      setPending(false);
      on_restored();
      onClose();
    } catch (e: unknown) {
      setPending(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Restore version ${ancestor_version_number}?`}
      confirm_label={pending ? "Restoring…" : "Restore"}
      cancel_label="Cancel"
      onConfirm={handleConfirm}
      onCancel={onClose}
    >
      <div data-testid="restore-confirm-body" style={{ fontSize: "var(--font-size-sm, 13px)" }}>
        Restoring version {ancestor_version_number} will create a new version (v
        {current_version_number + 1}) and switch to it. The current version (v
        {current_version_number}) and all later versions are preserved.
        {error ? (
          <div
            data-testid="restore-confirm-error"
            style={{
              marginTop: "var(--space-2, 8px)",
              color: "var(--color-severity-error, #dc2626)",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
