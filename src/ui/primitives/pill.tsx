import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cn } from "#lib/utils";

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

// Token-driven palette: each variant maps to a coordinated (fg, bg [, border])
// triple drawn from argmap's domain tokens.css. Kept as a lookup table — not
// cva variants — so the runtime can reach the CSS custom properties at the
// :root level instead of forcing them through Tailwind arbitrary-value classes.
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
    color: "var(--color-status-foreclosed-accent)",
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
  const style: CSSProperties = {
    background: bgColor,
    color: fg,
    border: borderColor ? `1px solid ${borderColor}` : "1px solid transparent",
  };
  return (
    <span
      title={title}
      data-testid={rest["data-testid"]}
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap leading-[1.3]",
        size === "xs" ? "px-1 py-px text-[10px]" : "px-2 py-0.5 text-xs",
      )}
      style={style}
    >
      {children}
    </span>
  );
}
