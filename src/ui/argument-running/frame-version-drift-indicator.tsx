import type { ReactElement } from "react";
import { useFrameStore, useSessionStore, selectFrameVersionDrift } from "@/state";
import { SeverityIcon } from "../primitives";
import { cn } from "#lib/utils";

export interface FrameVersionDriftIndicatorProps {
  on_open_migration_dialog: () => void;
}

export function FrameVersionDriftIndicator(
  props: FrameVersionDriftIndicatorProps,
): ReactElement | null {
  const session_snapshot = useSessionStore((s) => s);
  const frame_snapshot = useFrameStore((s) => s);
  const drift = selectFrameVersionDrift(session_snapshot, frame_snapshot);

  if (!drift) return null;

  const { has_drift, session_version_number, current_version_number } = drift;

  // KEEP RAW: pill-shaped status indicator with severity-driven styling driven
  // by domain warning tokens; not expressible via shadcn Button variants.
  return (
    <button
      type="button"
      onClick={has_drift ? props.on_open_migration_dialog : undefined}
      data-testid="frame-version-drift-indicator"
      data-has-drift={has_drift ? "true" : "false"}
      disabled={!has_drift}
      title={
        has_drift
          ? `Frame has advanced — open migration dialog (v${current_version_number} available)`
          : `Session authored against frame v${session_version_number}`
      }
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums transition-colors",
        has_drift ? "cursor-pointer" : "cursor-default",
      )}
      style={{
        background: has_drift ? "var(--color-severity-warning-bg)" : "var(--color-surface-pane)",
        color: has_drift ? "var(--color-severity-warning)" : "var(--color-text-secondary)",
        borderColor: has_drift ? "var(--color-severity-warning)" : "var(--color-border-subtle)",
      }}
    >
      {has_drift ? <SeverityIcon severity="warning" size={11} /> : null}
      {has_drift
        ? `Frame v${session_version_number} · v${current_version_number} available`
        : `Frame v${session_version_number}`}
    </button>
  );
}
