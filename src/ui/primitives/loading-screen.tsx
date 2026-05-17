import type { ReactElement, ReactNode } from "react";

export interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading…" }: LoadingScreenProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "var(--space-4)",
        background: "var(--color-surface-canvas)",
      }}
    >
      {/* Brand wordmark on first paint so the app reads as itself even
          while data loads. Linear, Vercel, Notion all do this. */}
      <span
        style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "var(--letter-spacing-tight)",
          color: "var(--color-text-primary)",
        }}
      >
        argmap
      </span>
      <Spinner size={20} decorative />
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "var(--font-sans)",
          letterSpacing: "var(--letter-spacing-normal)",
          margin: 0,
        }}
      >
        {label}
      </p>
    </div>
  );
}

export interface SpinnerProps {
  size?: number;
  /**
   * §13 #15: when the spinner is nested inside another element that already
   * announces loading (a Button leading slot, an InlineLoading row, a status
   * region), pass decorative so the spinner does not double-announce. The
   * parent should expose aria-busy or its own role="status" to surface the
   * loading state. Default false to preserve the bare-spinner contract.
   */
  decorative?: boolean;
}

export function Spinner({ size = 22, decorative = false }: SpinnerProps): ReactElement {
  // The animation duration becomes ~0.01ms under prefers-reduced-motion
  // (see tokens.css), which would freeze the rotation mid-frame. Switch
  // to a non-spinning pulse instead so the affordance still communicates
  // "something is happening" without motion.
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "status", "aria-label": "Loading" } as const);
  return (
    <span
      {...a11y}
      className="argmap-spinner"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "var(--border-medium) solid var(--color-border-subtle)",
        borderTopColor: "var(--color-mode-current-accent)",
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

export interface InlineEmptyProps {
  children: ReactNode;
  testId?: string;
  density?: "comfortable" | "compact";
}

/**
 * Small, left-aligned tertiary-text empty state for inside panels and
 * sub-regions where the centered EmptyState would feel too dramatic. One
 * sentence of secondary copy; no icon; no CTA.
 *
 * Use this for "Nothing open", "No premises yet", inline "all clear" hints.
 * For full-pane empty states (no frame loaded, no sessions), use EmptyState.
 */
export function InlineEmpty({
  children,
  testId,
  density = "comfortable",
}: InlineEmptyProps): ReactElement {
  const pad = density === "compact" ? "var(--space-3)" : "var(--space-4)";
  return (
    <div
      data-testid={testId}
      style={{
        padding: pad,
        color: "var(--color-text-tertiary)",
        fontSize: "var(--font-size-sm)",
        lineHeight: "var(--line-height-relaxed)",
      }}
    >
      {children}
    </div>
  );
}

export interface InlineLoadingProps {
  label?: string;
  testId?: string;
}

/**
 * Inline loading row — spinner + label, left-aligned, for use inside panels
 * during data fetches. Match this to InlineEmpty's density and color tone so
 * loading and empty states feel like the same primitive at different moments.
 */
export function InlineLoading({ label = "Loading…", testId }: InlineLoadingProps): ReactElement {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      style={{
        padding: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <Spinner size={14} decorative />
      <span>{label}</span>
    </div>
  );
}
