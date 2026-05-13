import type { ReactElement } from "react";
import { useSessionStore, selectStatusSummary, type StatusSummary } from "@/state";

export interface StatusSummaryChipProps {
  override?: StatusSummary | null;
}

export function StatusSummaryChip(props: StatusSummaryChipProps): ReactElement | null {
  const live = useSessionStore((s) => selectStatusSummary(s));
  const summary = props.override !== undefined ? props.override : live;
  if (!summary) return null;

  let label: string;
  let tone: "success" | "neutral" | "warning" | "subdued";

  if (summary.shape === "determinate") {
    label = `complete · ${summary.conclusion_label ?? "(no conclusion)"}`;
    tone = "success";
  } else if (summary.shape === "conditional") {
    label = `${summary.resolved_count}/${summary.total_count} resolved · tentative: ${
      summary.conclusion_label ?? "(no conclusion)"
    }`;
    tone = "neutral";
  } else if (summary.shape === "contested") {
    label = `contested${summary.conclusion_label ? `: ${summary.conclusion_label}` : ""}`;
    tone = "warning";
  } else {
    label = "indeterminate";
    tone = "subdued";
  }

  const palette: Record<typeof tone, { bg: string; fg: string }> = {
    success: {
      bg: "var(--color-background-success, #ecfdf5)",
      fg: "var(--color-text-success, #047857)",
    },
    neutral: {
      bg: "var(--color-background-secondary, #f3f4f6)",
      fg: "var(--color-text-primary, #111827)",
    },
    warning: {
      bg: "var(--color-background-warning, #fef3c7)",
      fg: "var(--color-text-warning, #92400e)",
    },
    subdued: {
      bg: "var(--color-background-secondary, #f3f4f6)",
      fg: "var(--color-text-tertiary, #9ca3af)",
    },
  };
  const { bg, fg } = palette[tone];

  return (
    <span
      data-testid="status-summary-chip"
      data-shape={summary.shape}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "var(--border-radius-md, 6px)",
        background: bg,
        color: fg,
        fontSize: "var(--font-size-xs, 11px)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
