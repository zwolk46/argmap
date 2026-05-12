import type { ReactElement } from "react";
import type { NodeStatus } from "@/schema";
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

const STATUS_ICONS: Record<string, string> = {
  satisfied: "✓",
  open: "○",
  contested: "⚠",
  foreclosed: "✕",
  not_applicable: "—",
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
  const icon = STATUS_ICONS[s] ?? "?";
  const dimension = size === "sm" ? "18px" : "22px";
  const fontSize = size === "sm" ? "var(--font-size-xs)" : "var(--font-size-sm)";

  const badge = (
    <span
      data-testid={`status-badge-${s}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dimension,
        height: dimension,
        borderRadius: "var(--radius-pill)",
        background: colors.bg,
        color: colors.color,
        fontSize,
        fontWeight: "var(--font-weight-medium)",
        fontFamily: "var(--font-sans)",
        transition: `opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)`,
        cursor: failed_conditions?.length ? "help" : "default",
        flexShrink: 0,
      }}
      aria-label={`Status: ${s}`}
    >
      {icon}
    </span>
  );

  const showSubflag =
    legal_mode &&
    s === "satisfied" &&
    via?.some((v) => v === "binding_authority" || v === "persuasive_authority");

  const isBinding = via?.includes("binding_authority");

  const tooltipContent =
    failed_conditions && failed_conditions.length > 0 ? (
      <ul style={{ margin: 0, padding: "0 0 0 var(--space-3)", listStyle: "disc" }}>
        {failed_conditions.map((c) => (
          <li key={c} style={{ marginBottom: "var(--space-1)" }}>
            {failedConditionMessage(c)}
          </li>
        ))}
      </ul>
    ) : null;

  const wrappedBadge = tooltipContent ? (
    <Tooltip content={tooltipContent}>{badge}</Tooltip>
  ) : (
    badge
  );

  if (!showSubflag) return wrappedBadge;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
      {wrappedBadge}
      <span
        data-testid={isBinding ? "subflag-binding" : "subflag-persuasive"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 var(--space-1)",
          borderRadius: "var(--radius-pill)",
          background: isBinding
            ? "var(--color-subflag-binding-bg)"
            : "var(--color-subflag-persuasive-bg)",
          color: isBinding
            ? "var(--color-subflag-binding)"
            : "var(--color-subflag-persuasive)",
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        ⚖ {isBinding ? "B" : "P"}
      </span>
    </span>
  );
}
