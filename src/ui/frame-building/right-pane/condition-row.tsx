import * as React from "react";
import type { ReactElement } from "react";
import type { Condition, ConditionKind, BurdenLevel } from "@/schema";
import { IconButton } from "../../primitives";
import { UIcon } from "../../primitives/uicon";

export interface ConditionRowProps {
  condition: Condition;
  on_change: (updated: Condition) => void;
  on_remove: () => void;
}

const KIND_LABELS: Record<ConditionKind, string> = {
  premise_attached: "Premise attached",
  interpretation_selected: "Interpretation selected",
  all_children_resolved: "All children resolved",
  path_complete: "Path complete",
  not_contradicted: "Not contradicted",
  premise_kind_in: "Premise kind in",
  burden_met: "Burden met",
  authority_required: "Authority required",
  authority_binding: "Authority binding",
  not_distinguished: "Not distinguished",
  standard_of_review_applied: "Standard of review applied",
  not_foreclosed: "Not foreclosed",
};

const BURDEN_LEVELS: BurdenLevel[] = [
  "preponderance",
  "clear_and_convincing",
  "beyond_reasonable_doubt",
  "scintilla",
  "substantial_evidence",
];

export function conditionLabel(condition: Condition): string {
  return KIND_LABELS[condition.kind] ?? condition.kind;
}

export function ConditionRow(props: ConditionRowProps): ReactElement {
  const { condition, on_change, on_remove } = props;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "var(--space-2)",
        background: "var(--color-surface-pane)",
        borderRadius: "var(--radius-sm)",
        marginBottom: "var(--space-1)",
      }}
    >
      {/* Kind pill */}
      <span
        style={{
          padding: "2px var(--space-2)",
          background: "var(--color-surface-hover)",
          borderRadius: "var(--radius-pill)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-primary)",
          flexShrink: 0,
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        {KIND_LABELS[condition.kind] ?? condition.kind}
      </span>

      {/* Parameters */}
      <div style={{ flex: 1 }}>
        {condition.kind === "burden_met" && (
          <select
            value={condition.level}
            onChange={(e) =>
              on_change({ ...condition, level: e.currentTarget.value as BurdenLevel })
            }
            className="argmap-input"
            style={INPUT_STYLE}
          >
            {BURDEN_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
        {condition.kind === "premise_kind_in" && (
          <input
            type="text"
            value={condition.kinds.join(", ")}
            onChange={(e) =>
              on_change({
                ...condition,
                kinds: e.currentTarget.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Comma-separated kinds…"
            className="argmap-input"
            style={INPUT_STYLE}
          />
        )}
      </div>

      {/* Remove button */}
      <IconButton aria-label="Remove condition" onClick={on_remove} size="sm">
        <UIcon name="times" size={14} />
      </IconButton>
    </div>
  );
}

// Compact density override for inline condition-row layout: tighter padding
// and smaller font than the default .argmap-input, so multiple condition
// rows fit cleanly in the inspector pane.
const INPUT_STYLE: React.CSSProperties = {
  padding: "2px var(--space-1)",
  fontSize: "var(--font-size-xs)",
};
