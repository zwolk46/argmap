import type { ReactElement, ReactNode } from "react";

export interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading…" }: LoadingScreenProps): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "var(--space-3)",
        background: "var(--color-surface-canvas)",
      }}
    >
      <Spinner />
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "var(--font-sans)",
          letterSpacing: "var(--letter-spacing-normal)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

export function Spinner({ size = 22 }: { size?: number }): ReactElement {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "var(--border-medium) solid var(--color-border-subtle)",
        borderTopColor: "var(--color-mode-current-accent)",
        animation: "argmap-spin 0.8s linear infinite",
      }}
    />
  );
}

export interface EmptyStateProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function CanvasEmptyState(props: EmptyStateProps): ReactElement {
  return <EmptyState {...props} />;
}

export function EmptyState({ label, description, icon, action }: EmptyStateProps): ReactElement {
  return (
    <div
      data-testid="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        textAlign: "center",
        padding: "var(--space-8) var(--space-5)",
        color: "var(--color-text-secondary)",
        height: "100%",
      }}
    >
      {icon ? (
        <div
          aria-hidden="true"
          style={{
            color: "var(--color-text-tertiary)",
            opacity: 0.7,
          }}
        >
          {icon}
        </div>
      ) : null}
      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-text-primary)",
        }}
      >
        {label}
      </p>
      {description ? (
        <p
          style={{
            margin: 0,
            maxWidth: "320px",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-normal)",
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: "var(--space-2)" }}>{action}</div> : null}
    </div>
  );
}
