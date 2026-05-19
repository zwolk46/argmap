import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { useFrameStore, useSessionStore } from "@/state";
import { SeverityIcon, severityFromValidation } from "../primitives/severity-icon";

export interface ValidationIndicatorProps {
  surface: "frame_building" | "argument_running";
  onOpenDrawer?: (results: ReadonlyArray<ValidationResult>) => void;
}

// §9 #12: surface error count and warning count separately so a mixed
// validation set ("1 error + 4 warnings") doesn't collapse to "5 issues"
// — the user needs to see at a glance whether anything blocks.
function pluralize(noun: string, n: number): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export function ValidationIndicator({
  surface,
  onOpenDrawer,
}: ValidationIndicatorProps): ReactElement {
  const frame_validation = useFrameStore((s) => s.validation);
  const compute_result = useSessionStore((s) => s.compute_result);

  const results: ReadonlyArray<ValidationResult> =
    surface === "frame_building" ? frame_validation : (compute_result?.validation_results ?? []);

  const severity = severityFromValidation(results);
  const error_count = results.filter((r) => r.severity === "error").length;
  const warning_count = results.filter((r) => r.severity === "warning").length;
  const tone =
    severity === "error"
      ? "var(--color-severity-error)"
      : severity === "warning"
        ? "var(--color-severity-warning)"
        : "var(--color-text-tertiary)";

  let label: string;
  if (error_count === 0 && warning_count === 0) {
    label = "No issues";
  } else if (error_count > 0 && warning_count > 0) {
    label = `${pluralize("error", error_count)}, ${pluralize("warning", warning_count)}`;
  } else if (error_count > 0) {
    label = pluralize("error", error_count);
  } else {
    label = pluralize("warning", warning_count);
  }

  return (
    // KEEP RAW: pill-shaped status indicator with severity-driven tone; not expressible via Button variants.
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
