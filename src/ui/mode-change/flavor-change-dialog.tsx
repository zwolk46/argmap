import * as React from "react";
import type { ReactElement } from "react";
import type { Flavor } from "@/schema";
import { useFrameStore, useRepository, scanFlavorChange } from "@/state";
import { ConfirmDialog } from "../primitives";
import { AdvisoryList } from "./advisory-list";

export interface FlavorChangeDialogProps {
  open: boolean;
  onClose: () => void;
  target_flavor: Flavor;
}

export function FlavorChangeDialog(props: FlavorChangeDialogProps): ReactElement | null {
  const { open, onClose, target_flavor } = props;
  const current_version = useFrameStore((s) => s.frame_version);
  const current_flavor = useFrameStore((s) => s.frame?.flavor);
  const { frame_store } = useRepository();

  const scan_result = React.useMemo(() => {
    if (!current_version || !current_flavor) return null;
    return scanFlavorChange(current_version, current_flavor, target_flavor);
  }, [current_version, current_flavor, target_flavor]);

  if (!open || !current_version || !current_flavor) return null;
  const same_as_current = current_flavor === target_flavor;

  function handleConfirm(): void {
    if (same_as_current) return;
    frame_store.getState().applyPatch({
      kind: "metadata_edited",
      partial: { flavor: target_flavor },
    });
    onClose();
  }

  return (
    <ConfirmDialog
      open={true}
      title={`Switch to ${target_flavor} flavor?`}
      confirm_label="Switch"
      onConfirm={handleConfirm}
      onCancel={onClose}
    >
      <div data-testid="flavor-change-body" style={{ fontSize: "var(--font-size-sm)" }}>
        <p>
          Switch flavor from <strong>{current_flavor}</strong> to <strong>{target_flavor}</strong>?
        </p>
        {scan_result && scan_result.advisory.length > 0 ? (
          <AdvisoryList advisory={scan_result.advisory} />
        ) : (
          <p style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>No advisories.</p>
        )}
      </div>
    </ConfirmDialog>
  );
}
