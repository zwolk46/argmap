import type { ReactElement } from "react";
import { useFrameStore, useSessionStore, selectFrameVersionDrift } from "@/state";
import { SeverityIcon } from "../primitives";

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
  return (
    // KEEP RAW: pill-shaped status indicator with severity-driven styling; not expressible via Button variants.
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "2px var(--space-2)",
        borderRadius: "var(--radius-pill)",
        background: has_drift ? "var(--color-severity-warning-bg)" : "var(--color-surface-pane)",
        color: has_drift ? "var(--color-severity-warning)" : "var(--color-text-secondary)",
        border: has_drift
          ? "var(--border-thin) solid var(--color-severity-warning)"
          : "var(--border-thin) solid var(--color-border-subtle)",
        cursor: has_drift ? "pointer" : "default",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        fontFamily: "var(--font-sans)",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        transition: "background-color var(--duration-fast) var(--ease-standard)",
      }}
    >
      {has_drift ? <SeverityIcon severity="warning" size={11} /> : null}
      {has_drift
        ? `Frame v${session_version_number} · v${current_version_number} available`
        : `Frame v${session_version_number}`}
    </button>
  );
}
