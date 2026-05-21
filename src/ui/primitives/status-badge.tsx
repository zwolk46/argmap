import type { ReactElement } from "react";
import { type Icon, Check, Circle, Warning, X, Minus, Scales } from "@phosphor-icons/react";
import type { NodeStatus } from "@/schema";
import { Pill } from "./pill";
import { Tooltip } from "./tooltip";

export const FAILED_CONDITION_MESSAGES: Record<string, string> = {
  no_premise: "No premise has been provided.",
  premise_contradicted: "The premise is contradicted by another premise.",
  burden_unmet: "The burden of proof has not been met.",
  authority_missing: "A required authority is missing.",
  structural: "A structural requirement is not satisfied.",
  no_interpretation: "No interpretation has been selected.",
  no_checkpoint_answer: "This checkpoint has not been answered.",
  all_branches_foreclosed: "All branches leading here are foreclosed.",
  gate_inputs_missing: "Required inputs to this gate are missing.",
  inputs_indeterminate: "Gate inputs are indeterminate — one or more LEADS_TO paths remain open.",
  conclusion_direction_missing: "The conclusion direction has not been set.",
  no_active_path: "No active path reaches this node.",
  precondition_unmet: "A precondition for this node is not met.",
};

export function failedConditionMessage(condition: string): string {
  return FAILED_CONDITION_MESSAGES[condition] ?? `Condition not met: ${condition}`;
}

const STATUS_LABELS: Record<string, string> = {
  satisfied: "✓",
  open: "○",
  contested: "⚠",
  foreclosed: "✕",
  not_applicable: "—",
};

const STATUS_GLYPHS: Record<string, Icon> = {
  satisfied: Check,
  open: Circle,
  contested: Warning,
  foreclosed: X,
  not_applicable: Minus,
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  satisfied: {
    color: "var(--color-status-satisfied)",
    bg: "var(--color-status-satisfied-bg)",
  },
  open: {
    color: "var(--color-status-open)",
    bg: "var(--color-status-open-bg)",
  },
  contested: {
    color: "var(--color-status-contested)",
    bg: "var(--color-status-contested-bg)",
  },
  foreclosed: {
    color: "var(--color-status-foreclosed)",
    bg: "var(--color-status-foreclosed-bg)",
  },
  not_applicable: {
    color: "var(--color-status-not-applicable)",
    bg: "var(--color-status-not-applicable-bg)",
  },
};

export interface StatusBadgeProps {
  status: NodeStatus;
  legal_mode?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, legal_mode, size = "md" }: StatusBadgeProps): ReactElement {
  const { status: s, via, failed_conditions } = status;
  const colors = STATUS_COLORS[s] ?? STATUS_COLORS.open;
  const label = STATUS_LABELS[s] ?? "?";
  const Glyph = STATUS_GLYPHS[s] ?? Circle;
  const dimensionPx = size === "sm" ? 18 : 22;
  const glyphPx = size === "sm" ? 12 : 14;

  const badge = (
    <span
      data-testid={`status-badge-${s}`}
      data-status={s}
      className="argmap-status-badge inline-flex items-center justify-center rounded-full"
      key={s}
      style={{
        width: dimensionPx,
        height: dimensionPx,
        background: colors.bg,
        color: colors.color,
        cursor: failed_conditions?.length ? "help" : "default",
        flexShrink: 0,
        position: "relative",
      }}
      aria-label={`Status: ${s}`}
    >
      <Glyph size={glyphPx} weight={s === "satisfied" || s === "foreclosed" ? "bold" : "regular"} />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {label}
      </span>
    </span>
  );

  const showSubflag =
    legal_mode &&
    s === "satisfied" &&
    via?.some((v) => v === "binding_authority" || v === "persuasive_authority");

  const isBinding = via?.includes("binding_authority");

  const tooltipContent =
    failed_conditions && failed_conditions.length > 0 ? (
      <ul className="m-0 list-disc pl-3">
        {failed_conditions.map((c) => (
          <li key={c} className="mb-1">
            {failedConditionMessage(c)}
          </li>
        ))}
      </ul>
    ) : null;

  const wrappedBadge = tooltipContent ? <Tooltip content={tooltipContent}>{badge}</Tooltip> : badge;

  if (!showSubflag) return wrappedBadge;

  return (
    <span className="inline-flex items-center gap-1">
      {wrappedBadge}
      <Pill
        size="xs"
        variant={isBinding ? "subflag_binding" : "subflag_persuasive"}
        data-testid={isBinding ? "subflag-binding" : "subflag-persuasive"}
      >
        <Scales size={11} weight="regular" />
        {isBinding ? "B" : "P"}
      </Pill>
    </span>
  );
}
