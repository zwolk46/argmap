import * as React from "react";
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

const STATUS_LABELS: Record<string, string> = {
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

function StatusGlyph({ status, px }: { status: string; px: number }): React.ReactElement {
  const stroke = 1.6;
  const common = {
    width: px,
    height: px,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (status === "satisfied") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.25" />
        <path d="m5.2 8.3 1.9 1.9 3.6-3.7" />
      </svg>
    );
  }
  if (status === "open") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.25" />
      </svg>
    );
  }
  if (status === "contested") {
    return (
      <svg {...common}>
        <path d="M3.5 11 8 3l4.5 8z" />
        <path d="M8 6.5v3" />
        <circle cx="8" cy="11" r="0.55" fill="currentColor" />
      </svg>
    );
  }
  if (status === "foreclosed") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.25" />
        <path d="M5.3 5.3 10.7 10.7M10.7 5.3 5.3 10.7" />
      </svg>
    );
  }
  // not_applicable — dimmed dash inside circle
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6.25" opacity={0.6} />
      <path d="M5 8h6" opacity={0.7} />
    </svg>
  );
}

export interface StatusBadgeProps {
  status: NodeStatus;
  legal_mode?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, legal_mode, size = "md" }: StatusBadgeProps): ReactElement {
  const { status: s, via, failed_conditions } = status;
  const colors = STATUS_COLORS[s] ?? STATUS_COLORS.open;
  const label = STATUS_LABELS[s] ?? "?";
  const dimensionPx = size === "sm" ? 18 : 22;
  const glyphPx = size === "sm" ? 12 : 14;

  const badge = (
    <span
      data-testid={`status-badge-${s}`}
      className="argmap-status-badge"
      key={s}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dimensionPx,
        height: dimensionPx,
        borderRadius: "var(--radius-pill)",
        background: colors.bg,
        color: colors.color,
        fontFamily: "var(--font-sans)",
        cursor: failed_conditions?.length ? "help" : "default",
        flexShrink: 0,
        position: "relative",
      }}
      aria-label={`Status: ${s}`}
    >
      <StatusGlyph status={s} px={glyphPx} />
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
      <ul style={{ margin: 0, padding: "0 0 0 var(--space-3)", listStyle: "disc" }}>
        {failed_conditions.map((c) => (
          <li key={c} style={{ marginBottom: "var(--space-1)" }}>
            {failedConditionMessage(c)}
          </li>
        ))}
      </ul>
    ) : null;

  const wrappedBadge = tooltipContent ? <Tooltip content={tooltipContent}>{badge}</Tooltip> : badge;

  if (!showSubflag) return wrappedBadge;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)" }}>
      {wrappedBadge}
      <span
        data-testid={isBinding ? "subflag-binding" : "subflag-persuasive"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          padding: "1px var(--space-1)",
          borderRadius: "var(--radius-pill)",
          background: isBinding
            ? "var(--color-subflag-binding-bg)"
            : "var(--color-subflag-persuasive-bg)",
          color: isBinding ? "var(--color-subflag-binding)" : "var(--color-subflag-persuasive)",
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "var(--letter-spacing-wide)",
          lineHeight: 1,
        }}
      >
        <span aria-hidden style={{ fontSize: "11px" }}>
          ⚖
        </span>
        {isBinding ? "B" : "P"}
      </span>
    </span>
  );
}
