import type { ReactElement, ReactNode } from "react";

export type PillVariant =
  | "neutral"
  | "status_open"
  | "status_satisfied"
  | "status_contested"
  | "status_foreclosed"
  | "status_na"
  | "severity_warning"
  | "severity_error"
  | "ai_accent"
  | "mode_accent"
  | "subflag_binding"
  | "subflag_persuasive"
  | "milestone";

export type PillSize = "xs" | "sm";

export interface PillProps {
  children: ReactNode;
  /** Preferred — selects a coordinated color pair. */
  variant?: PillVariant;
  /** Optional outline border in addition to fill. */
  outline?: boolean;
  /** Manual color override (escape hatch). */
  color?: string;
  /** Manual background override (escape hatch). */
  bg?: string;
  size?: PillSize;
  title?: string;
  "data-testid"?: string;
}

const VARIANTS: Record<PillVariant, { color: string; bg: string; border?: string }> = {
  neutral: {
    color: "var(--color-text-secondary)",
    bg: "var(--color-surface-pane)",
    border: "var(--color-border-subtle)",
  },
  status_open: {
    color: "var(--color-status-open)",
    bg: "var(--color-status-open-bg)",
  },
  status_satisfied: {
    color: "var(--color-status-satisfied)",
    bg: "var(--color-status-satisfied-bg)",
  },
  status_contested: {
    color: "var(--color-status-contested)",
    bg: "var(--color-status-contested-bg)",
  },
  status_foreclosed: {
    color: "var(--color-status-foreclosed)",
    bg: "var(--color-status-foreclosed-bg)",
  },
  status_na: {
    color: "var(--color-status-not-applicable)",
    bg: "var(--color-status-not-applicable-bg)",
  },
  severity_warning: {
    color: "var(--color-severity-warning)",
    bg: "var(--color-severity-warning-bg)",
  },
  severity_error: {
    color: "var(--color-severity-error)",
    bg: "var(--color-severity-error-bg)",
  },
  ai_accent: {
    color: "var(--color-ai-accent)",
    bg: "var(--color-ai-accent-bg)",
    border: "var(--color-ai-accent)",
  },
  mode_accent: {
    color: "var(--color-mode-current-accent)",
    bg: "var(--color-mode-current-accent-bg)",
  },
  subflag_binding: {
    color: "var(--color-subflag-binding)",
    bg: "var(--color-subflag-binding-bg)",
  },
  subflag_persuasive: {
    color: "var(--color-subflag-persuasive)",
    bg: "var(--color-subflag-persuasive-bg)",
  },
  milestone: {
    color: "var(--color-milestone-star)",
    bg: "var(--color-status-not-applicable-bg)",
  },
};

export function Pill({
  children,
  variant = "neutral",
  outline,
  color,
  bg,
  size = "sm",
  title,
  ...rest
}: PillProps): ReactElement {
  const v = VARIANTS[variant];
  const fg = color ?? v.color;
  const bgColor = bg ?? v.bg;
  const borderColor = outline ? (v.border ?? fg) : null;
  return (
    <span
      title={title}
      data-testid={rest["data-testid"]}
      data-variant={variant}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: size === "xs" ? "1px var(--space-1)" : "2px var(--space-2)",
        borderRadius: "var(--radius-pill)",
        background: bgColor,
        color: fg,
        border: borderColor
          ? `var(--border-thin) solid ${borderColor}`
          : "var(--border-thin) solid transparent",
        fontSize: size === "xs" ? "var(--font-size-2xs)" : "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        fontFamily: "var(--font-sans)",
        lineHeight: 1.3,
        letterSpacing: "var(--letter-spacing-normal)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
