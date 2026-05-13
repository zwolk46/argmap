import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";

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

function PassGlyph({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.25 8.3 1.9 1.9 3.6-3.7" />
    </svg>
  );
}

function WarningGlyph({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2.2 14.4 13H1.6Z" />
      <path d="M8 6.5v3" />
      <circle cx="8" cy="11.5" r="0.55" fill="currentColor" />
    </svg>
  );
}

function ErrorGlyph({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.25" />
      <path d="M5.3 5.3 10.7 10.7M10.7 5.3 5.3 10.7" />
    </svg>
  );
}

export function SeverityIcon({ severity, size = 14 }: SeverityIconProps): ReactElement {
  const Glyph =
    severity === "pass" ? PassGlyph : severity === "warning" ? WarningGlyph : ErrorGlyph;
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
      }}
    >
      <Glyph size={size} />
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
