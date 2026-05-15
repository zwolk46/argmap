import type { ReactElement, ReactNode } from "react";

export type InlineAlertKind = "error" | "warning" | "success" | "info";

export interface InlineAlertProps {
  kind: InlineAlertKind;
  children: ReactNode;
  testId?: string;
  /** Override the implicit aria role (default: alert for error, status otherwise). */
  role?: "alert" | "status";
}

/**
 * Inline alert banner. Used inside forms, dialogs, and pages where a
 * persistent message needs to convey severity without overlaying the rest
 * of the surface (use `useToast` for transient feedback instead).
 *
 * Colors map to the same severity scale that Toast and Pill use, so a
 * red error alert and a red error toast read as the same family.
 */
const KIND_STYLES: Record<InlineAlertKind, { fg: string; bg: string }> = {
  error: {
    fg: "var(--color-severity-error)",
    bg: "var(--color-severity-error-bg)",
  },
  warning: {
    fg: "var(--color-severity-warning)",
    bg: "var(--color-severity-warning-bg)",
  },
  success: {
    fg: "var(--color-status-satisfied)",
    bg: "var(--color-status-satisfied-bg)",
  },
  info: {
    fg: "var(--color-text-primary)",
    bg: "var(--color-surface-pane)",
  },
};

export function InlineAlert({ kind, children, testId, role }: InlineAlertProps): ReactElement {
  const styles = KIND_STYLES[kind];
  const resolvedRole = role ?? (kind === "error" ? "alert" : "status");
  return (
    <div
      data-testid={testId}
      role={resolvedRole}
      aria-live={kind === "error" ? "assertive" : "polite"}
      style={{
        padding: "var(--space-2) var(--space-3)",
        fontSize: "var(--font-size-sm)",
        lineHeight: "var(--line-height-normal)",
        background: styles.bg,
        color: styles.fg,
        borderLeft: `var(--border-medium) solid ${styles.fg}`,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {children}
    </div>
  );
}
