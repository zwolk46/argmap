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
    // Pill-shaped status indicator with severity-driven tone; not expressible
    // via shadcn Button variants (custom color tied to severity tokens).
    <button
      type="button"
      data-testid="validation-indicator"
      data-severity={severity}
      aria-label={`Validation: ${label}`}
      onClick={() => onOpenDrawer?.(results)}
      className="inline-flex items-center gap-1 h-[26px] px-2 rounded-full bg-transparent border border-transparent cursor-pointer text-xs font-medium font-sans transition-colors hover:bg-muted/40 hover:border-border focus-visible:ring-[3px] focus-visible:ring-ring/50"
      style={{ color: tone }}
    >
      <SeverityIcon severity={severity} size={14} />
      <span>{label}</span>
    </button>
  );
}
