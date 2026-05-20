import type { ReactElement, ReactNode } from "react";
import { cn } from "#lib/utils";

export interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading…" }: LoadingScreenProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center h-screen gap-4 bg-background"
    >
      {/* Brand wordmark on first paint so the app reads as itself even while
          data loads. Linear, Vercel, Notion all do this. */}
      <span className="text-xl font-semibold tracking-tight text-foreground">argmap</span>
      <Spinner size={20} decorative />
      <p className="text-sm text-muted-foreground m-0 font-sans">{label}</p>
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
  className?: string;
}

export function Spinner({ size = 22, decorative = false, className }: SpinnerProps): ReactElement {
  // tw-animate-css ships the `animate-spin` keyframe; tokens.css reduces it
  // to a near-static pulse under prefers-reduced-motion via .argmap-spinner.
  // Keeping the class name so the existing reduced-motion override applies.
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "status", "aria-label": "Loading" } as const);
  return (
    <span
      {...a11y}
      className={cn(
        "argmap-spinner inline-block rounded-full border-2 border-border animate-spin",
        className,
      )}
      style={{
        width: size,
        height: size,
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
      className="flex flex-col items-center justify-center gap-3 text-center px-5 py-8 text-muted-foreground h-full"
    >
      {icon ? (
        <div aria-hidden="true" className="opacity-70 text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="m-0 text-base font-medium text-foreground">{label}</p>
      {description ? (
        <p className="m-0 max-w-xs text-sm text-muted-foreground leading-normal">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
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
  return (
    <div
      data-testid={testId}
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        density === "compact" ? "p-3" : "p-4",
      )}
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
      className="p-4 flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Spinner size={14} decorative />
      <span>{label}</span>
    </div>
  );
}
