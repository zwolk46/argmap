import * as React from "react";
import type { ReactElement } from "react";
import type { Condition, ConditionKind, BurdenLevel } from "@/schema";

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
        gap: "var(--space-2, 8px)",
        padding: "var(--space-2, 8px)",
        background: "var(--color-surface-pane, #f9fafb)",
        borderRadius: "var(--radius-sm, 4px)",
        marginBottom: "4px",
      }}
    >
      {/* Kind pill */}
      <span
        style={{
          padding: "2px 8px",
          background: "var(--color-surface-hover, rgba(0,0,0,0.05))",
          borderRadius: "9999px",
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-primary, #111827)",
          flexShrink: 0,
          fontWeight: 500,
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
            style={INPUT_STYLE}
          />
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={on_remove}
        aria-label="Remove condition"
        style={{
          flexShrink: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-tertiary, #9ca3af)",
          padding: "0 4px",
          fontSize: "14px",
        }}
      >
        ×
      </button>
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "2px 6px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "var(--radius-sm, 4px)",
  fontSize: "var(--font-size-xs, 11px)",
};
