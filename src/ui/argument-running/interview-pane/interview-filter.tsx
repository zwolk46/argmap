import type { ReactElement } from "react";
import type { InterviewItem } from "@/state";

type NodeTypeFilter = "Checkpoint" | "Term" | "Interpretation";
type ReasonFilter = InterviewItem["reason"];

export interface InterviewFilterState {
  node_types: ReadonlyArray<NodeTypeFilter>;
  jurisdictional_scope: "all" | "jurisdictional_only";
  reasons: ReadonlyArray<ReasonFilter>;
}

export const DEFAULT_INTERVIEW_FILTER: InterviewFilterState = {
  node_types: [],
  jurisdictional_scope: "all",
  reasons: [],
};

export const INTERVIEW_FILTER_NODE_TYPES: ReadonlyArray<NodeTypeFilter> = [
  "Checkpoint",
  "Term",
  "Interpretation",
];

export const INTERVIEW_FILTER_REASONS: ReadonlyArray<ReasonFilter> = [
  "open",
  "indeterminate",
  "contested",
  "best_inference_pending",
];

export interface InterviewFilterProps {
  state: InterviewFilterState;
  on_change: (next: InterviewFilterState) => void;
}

export function InterviewFilter(props: InterviewFilterProps): ReactElement {
  const { state, on_change } = props;

  function toggle_node_type(t: NodeTypeFilter): void {
    const has = state.node_types.includes(t);
    const next = has ? state.node_types.filter((x) => x !== t) : [...state.node_types, t];
    on_change({ ...state, node_types: next });
  }

  function toggle_reason(r: ReasonFilter): void {
    const has = state.reasons.includes(r);
    const next = has ? state.reasons.filter((x) => x !== r) : [...state.reasons, r];
    on_change({ ...state, reasons: next });
  }

  function toggle_jurisdiction(): void {
    on_change({
      ...state,
      jurisdictional_scope: state.jurisdictional_scope === "all" ? "jurisdictional_only" : "all",
    });
  }

  return (
    <div
      data-testid="interview-filter"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-1, 4px)",
        padding: "var(--space-2, 8px)",
        borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
      }}
    >
      {INTERVIEW_FILTER_NODE_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          data-testid={`interview-filter-type-${t}`}
          data-active={state.node_types.includes(t) ? "true" : "false"}
          onClick={() => toggle_node_type(t)}
          style={chipStyle(state.node_types.includes(t))}
        >
          {t}
        </button>
      ))}
      <button
        type="button"
        data-testid="interview-filter-jurisdiction"
        data-active={state.jurisdictional_scope === "jurisdictional_only" ? "true" : "false"}
        onClick={toggle_jurisdiction}
        style={chipStyle(state.jurisdictional_scope === "jurisdictional_only")}
      >
        {state.jurisdictional_scope === "jurisdictional_only" ? "Jurisdictional only" : "Show all"}
      </button>
      {INTERVIEW_FILTER_REASONS.map((r) => (
        <button
          key={r}
          type="button"
          data-testid={`interview-filter-reason-${r}`}
          data-active={state.reasons.includes(r) ? "true" : "false"}
          onClick={() => toggle_reason(r)}
          style={chipStyle(state.reasons.includes(r))}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function passesFilter(item: InterviewItem, state: InterviewFilterState): boolean {
  if (state.jurisdictional_scope === "jurisdictional_only" && !item.is_jurisdictional) {
    return false;
  }
  if (state.reasons.length > 0 && !state.reasons.includes(item.reason)) {
    return false;
  }
  return true;
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    background: active
      ? "var(--color-background-accent, #dbeafe)"
      : "var(--color-background-secondary, #f3f4f6)",
    color: active ? "var(--color-text-accent, #1d4ed8)" : "var(--color-text-secondary, #6b7280)",
    border: "none",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "var(--font-size-xs, 11px)",
    padding: "2px 8px",
  };
}
