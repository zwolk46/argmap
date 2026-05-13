import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { useFrameStore, useSessionStore } from "@/state";
import { SeverityIcon, severityFromValidation } from "../primitives/severity-icon";

export interface ValidationIndicatorProps {
  surface: "frame_building" | "argument_running";
  onOpenDrawer?: (results: ReadonlyArray<ValidationResult>) => void;
}

const SEVERITY_TEXT: Record<string, string> = {
  pass: "No issues",
  warning: "warning",
  error: "issue",
};

export function ValidationIndicator({
  surface,
  onOpenDrawer,
}: ValidationIndicatorProps): ReactElement {
  const frame_validation = useFrameStore((s) => s.validation);
  const compute_result = useSessionStore((s) => s.compute_result);

  const results: ReadonlyArray<ValidationResult> =
    surface === "frame_building" ? frame_validation : (compute_result?.validation_results ?? []);

  const severity = severityFromValidation(results);
  const count = results.length;
  const tone =
    severity === "error"
      ? "var(--color-severity-error)"
      : severity === "warning"
        ? "var(--color-severity-warning)"
        : "var(--color-text-tertiary)";

  const label =
    count === 0
      ? SEVERITY_TEXT.pass
      : `${count} ${severity === "error" ? SEVERITY_TEXT.error : SEVERITY_TEXT.warning}${count !== 1 ? "s" : ""}`;

  return (
    <button
      type="button"
      data-testid="validation-indicator"
      aria-label={`Validation: ${label}`}
      onClick={() => onOpenDrawer?.(results)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        height: "26px",
        padding: "0 var(--space-2)",
        background: "transparent",
        border: "var(--border-thin) solid transparent",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        color: tone,
        fontFamily: "var(--font-sans)",
        transition:
          "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <SeverityIcon severity={severity} size={14} />
      <span>{label}</span>
    </button>
  );
}
