import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Alert } from "#components/ui/alert";
import { cn } from "#lib/utils";

export type InlineAlertKind = "error" | "warning" | "success" | "info";

export interface InlineAlertProps {
  kind: InlineAlertKind;
  children: ReactNode;
  testId?: string;
  /** Override the implicit aria role (default: alert for error, status otherwise). */
  role?: "alert" | "status";
  /** DOM id, so a related form input can point at this alert via aria-describedby. */
  id?: string;
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

export function InlineAlert({ kind, children, testId, role, id }: InlineAlertProps): ReactElement {
  const styles = KIND_STYLES[kind];
  const resolvedRole = role ?? (kind === "error" ? "alert" : "status");
  const style: CSSProperties = {
    background: styles.bg,
    color: styles.fg,
    borderLeft: `3px solid ${styles.fg}`,
  };
  return (
    <Alert
      id={id}
      data-testid={testId}
      data-kind={kind}
      role={resolvedRole}
      aria-live={kind === "error" ? "assertive" : "polite"}
      style={style}
      className={cn(
        // override shadcn's default Alert padding so the banner reads as a
        // compact inline note rather than a full card.
        "px-3 py-2 text-sm leading-normal rounded-sm border-0",
      )}
    >
      {children}
    </Alert>
  );
}
