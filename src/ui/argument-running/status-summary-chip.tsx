import type { ReactElement } from "react";
import { useSessionStore, selectStatusSummary, type StatusSummary } from "@/state";
import { Pill } from "../primitives";
import type { PillVariant } from "../primitives";

export interface StatusSummaryChipProps {
  override?: StatusSummary | null;
}

export function StatusSummaryChip(props: StatusSummaryChipProps): ReactElement | null {
  const live = useSessionStore((s) => selectStatusSummary(s));
  const summary = props.override !== undefined ? props.override : live;
  if (!summary) return null;

  let label: string;
  let variant: PillVariant;

  if (summary.shape === "determinate") {
    label = `complete · ${summary.conclusion_label ?? "(no conclusion)"}`;
    variant = "status_satisfied";
  } else if (summary.shape === "conditional") {
    label = `${summary.resolved_count}/${summary.total_count} resolved · ${
      summary.conclusion_label ?? "(no conclusion)"
    }`;
    variant = "status_open";
  } else if (summary.shape === "contested") {
    label = `contested${summary.conclusion_label ? `: ${summary.conclusion_label}` : ""}`;
    variant = "severity_warning";
  } else {
    label = "indeterminate";
    variant = "status_na";
  }

  return (
    <span data-testid="status-summary-chip" data-shape={summary.shape}>
      <Pill variant={variant}>{label}</Pill>
    </span>
  );
}
