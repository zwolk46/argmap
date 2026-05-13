import type { ReactElement } from "react";
import { useFrameStore, useSessionStore, selectFrameVersionDrift } from "@/state";

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
    <button
      type="button"
      onClick={has_drift ? props.on_open_migration_dialog : undefined}
      data-testid="frame-version-drift-indicator"
      data-has-drift={has_drift ? "true" : "false"}
      disabled={!has_drift}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1, 4px)",
        padding: "2px 8px",
        borderRadius: "var(--border-radius-md, 6px)",
        background: has_drift
          ? "var(--color-background-warning, #fef3c7)"
          : "var(--color-background-secondary, #f3f4f6)",
        color: has_drift
          ? "var(--color-text-warning, #92400e)"
          : "var(--color-text-secondary, #6b7280)",
        border: "none",
        cursor: has_drift ? "pointer" : "default",
        fontSize: "var(--font-size-xs, 11px)",
        whiteSpace: "nowrap",
      }}
    >
      {has_drift
        ? `Frame v${session_version_number} (drift! · v${current_version_number} available)`
        : `Frame v${session_version_number}`}
    </button>
  );
}
