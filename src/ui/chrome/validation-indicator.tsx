import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { useFrameStore, useSessionStore } from "@/state";
import { SeverityIcon, severityFromValidation } from "../primitives/severity-icon";

export interface ValidationIndicatorProps {
  surface: "frame_building" | "argument_running";
  onOpenDrawer?: (results: ReadonlyArray<ValidationResult>) => void;
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

  return (
    <button
      data-testid="validation-indicator"
      aria-label={`Validation: ${severity}`}
      onClick={() => onOpenDrawer?.(results)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "var(--space-1) var(--space-2)",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <SeverityIcon severity={severity} size={14} />
      <span style={{ fontSize: "var(--font-size-xs)" }}>
        {results.length > 0 ? `${results.length}` : ""}
      </span>
    </button>
  );
}
