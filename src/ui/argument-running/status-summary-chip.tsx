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

  // H4: when conclusion_label is null/empty, drop the "·" and the placeholder
  // so the chip reads as the status word alone instead of "complete · (no
  // conclusion)" — empty labels happen between recomputes and the placeholder
  // misreads as a structured value.
  const conclusion = summary.conclusion_label?.trim();
  if (summary.shape === "determinate") {
    label = conclusion ? `complete · ${conclusion}` : "complete";
    variant = "status_satisfied";
  } else if (summary.shape === "conditional") {
    const counts = `${summary.resolved_count}/${summary.total_count} resolved`;
    label = conclusion ? `${counts} · ${conclusion}` : counts;
    variant = "status_open";
  } else if (summary.shape === "contested") {
    label = conclusion ? `contested: ${conclusion}` : "contested";
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
