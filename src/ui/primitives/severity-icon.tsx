import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";

export type Severity = "pass" | "warning" | "error";

export interface SeverityIconProps {
  severity: Severity;
  size?: number;
}

const COLORS: Record<Severity, string> = {
  pass: "var(--color-severity-pass)",
  warning: "var(--color-severity-warning)",
  error: "var(--color-severity-error)",
};

const LABELS: Record<Severity, string> = {
  pass: "✓",
  warning: "⚠",
  error: "✕",
};

export function SeverityIcon({ severity, size = 14 }: SeverityIconProps): ReactElement {
  const Glyph =
    severity === "pass" ? CheckCircle : severity === "warning" ? WarningCircle : XCircle;
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
        color: COLORS[severity],
        flexShrink: 0,
        lineHeight: 1,
        position: "relative",
      }}
    >
      <Glyph size={size} weight="regular" />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {LABELS[severity]}
      </span>
    </span>
  );
}

export function severityFromValidation(results: ReadonlyArray<ValidationResult>): Severity {
  if (results.length === 0) return "pass";
  if (results.some((r) => r.severity === "error")) return "error";
  if (results.some((r) => r.severity === "warning")) return "warning";
  return "pass";
}
