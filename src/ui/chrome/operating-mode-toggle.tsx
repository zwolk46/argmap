import * as React from "react";
import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { SegmentedToggle } from "../primitives/segmented-toggle";

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
      <SegmentedToggle options={OPTIONS} value={current_mode} onChange={handleChange} />
      {show_warning_dialog && (
        <div
          role="dialog"
          aria-label="Validation warnings"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-surface-overlay)",
          }}
        >
          <div
            style={{
              background: "var(--color-surface-elevated)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-5)",
              maxWidth: "400px",
            }}
          >
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-secondary)",
                margin: "0 0 var(--space-4)",
              }}
            >
              There are validation warnings. Proceed to Argument Running?
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowWarningDialog(false)}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  background: "var(--color-surface-pane)",
                  border: "var(--border-thin) solid var(--color-border-default)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowWarningDialog(false);
                  onSwitchWithWarnings?.();
                }}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  background: "var(--color-mode-current-accent)",
                  color: "var(--color-text-on-accent)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
