import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";

export type Severity = "pass" | "warning" | "error";

export interface SeverityIconProps {
  severity: Severity;
  size?: number;
}

const GLYPHS: Record<Severity, string> = {
  pass: "✓",
  warning: "⚠",
  error: "✕",
};

const COLORS: Record<Severity, string> = {
  pass: "var(--color-severity-pass)",
  warning: "var(--color-severity-warning)",
  error: "var(--color-severity-error)",
};

export function SeverityIcon({ severity, size = 14 }: SeverityIconProps): ReactElement {
  return (
    <span
      data-testid={`severity-icon-${severity}`}
      aria-label={`Severity: ${severity}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: size - 2,
        color: COLORS[severity],
        fontFamily: "var(--font-sans)",
        fontWeight: "var(--font-weight-semibold)",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {GLYPHS[severity]}
    </span>
  );
}

export function severityFromValidation(results: ReadonlyArray<ValidationResult>): Severity {
  if (results.length === 0) return "pass";
  if (results.some((r) => r.severity === "error")) return "error";
  if (results.some((r) => r.severity === "warning")) return "warning";
  return "pass";
}
