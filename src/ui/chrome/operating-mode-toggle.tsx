import * as React from "react";
import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { SegmentedToggle } from "../primitives/segmented-toggle";
import { ConfirmDialog } from "../primitives/confirm-dialog";

export interface OperatingModeToggleProps {
  current_mode: "frame_building" | "argument_running";
  validation: ReadonlyArray<ValidationResult>;
  onSwitchToArgument?: () => void;
  onSwitchToFrame?: () => void;
  onSwitchWithWarnings?: () => void;
  onValidationBlocked?: (errors: ReadonlyArray<ValidationResult>) => void;
}

const OPTIONS = [
  { value: "frame_building" as const, label: "Frame" },
  { value: "argument_running" as const, label: "Argument" },
];

export function OperatingModeToggle({
  current_mode,
  validation,
  onSwitchToArgument,
  onSwitchToFrame,
  onSwitchWithWarnings,
  onValidationBlocked,
}: OperatingModeToggleProps): ReactElement {
  const [show_warning_dialog, setShowWarningDialog] = React.useState(false);

  function handleChange(next: "frame_building" | "argument_running") {
    if (next === current_mode) return;

    if (next === "argument_running") {
      const errors = validation.filter((v) => v.severity === "error");
      const warnings = validation.filter((v) => v.severity === "warning");
      if (errors.length > 0) {
        onValidationBlocked?.(errors);
        return;
      }
      if (warnings.length > 0) {
        setShowWarningDialog(true);
        return;
      }
      onSwitchToArgument?.();
    } else {
      onSwitchToFrame?.();
    }
  }

  return (
    <>
      <SegmentedToggle
        options={OPTIONS}
        value={current_mode}
        onChange={handleChange}
        aria_label="Operating mode"
      />
      {/* §9 #14: the warning copy describes a real consequence (partial
          results), so the confirm action shouldn't read as a default
          primary "Continue" — promote it to a destructive variant with
          unambiguous "Switch anyway" copy. */}
      <ConfirmDialog
        open={show_warning_dialog}
        title="Validation warnings"
        confirm_label="Switch anyway"
        confirm_variant="danger"
        cancel_label="Keep editing"
        onCancel={() => setShowWarningDialog(false)}
        onConfirm={() => {
          setShowWarningDialog(false);
          onSwitchWithWarnings?.();
        }}
      >
        The frame has validation warnings. You can still switch to Argument Running, but ungated
        paths may produce incomplete results.
      </ConfirmDialog>
    </>
  );
}
