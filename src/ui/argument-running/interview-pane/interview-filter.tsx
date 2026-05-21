import type { ReactElement } from "react";
import type { InterviewItem } from "@/state";
import { cn } from "#lib/utils";

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

const CHIP_BASE =
  "inline-flex cursor-pointer items-center rounded-full border-0 px-2 py-0.5 text-[11px] transition-colors";
const CHIP_INACTIVE = "bg-muted text-muted-foreground hover:bg-muted/80";
const CHIP_ACTIVE = "bg-primary text-primary-foreground";

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
    <div data-testid="interview-filter" className="flex flex-wrap gap-1 border-b p-2">
      {/* KEEP RAW: pill-toggle chips with data-active state; not the standard Button taxonomy. */}
      {INTERVIEW_FILTER_NODE_TYPES.map((t) => {
        const active = state.node_types.includes(t);
        return (
          <button
            key={t}
            type="button"
            data-testid={`interview-filter-type-${t}`}
            data-active={active ? "true" : "false"}
            onClick={() => toggle_node_type(t)}
            className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}
          >
            {t}
          </button>
        );
      })}
      <button
        type="button"
        data-testid="interview-filter-jurisdiction"
        data-active={state.jurisdictional_scope === "jurisdictional_only" ? "true" : "false"}
        onClick={toggle_jurisdiction}
        className={cn(
          CHIP_BASE,
          state.jurisdictional_scope === "jurisdictional_only" ? CHIP_ACTIVE : CHIP_INACTIVE,
        )}
      >
        {state.jurisdictional_scope === "jurisdictional_only" ? "Jurisdictional only" : "Show all"}
      </button>
      {INTERVIEW_FILTER_REASONS.map((r) => {
        const active = state.reasons.includes(r);
        return (
          <button
            key={r}
            type="button"
            data-testid={`interview-filter-reason-${r}`}
            data-active={active ? "true" : "false"}
            onClick={() => toggle_reason(r)}
            className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

export function passesFilter(
  item: InterviewItem,
  state: InterviewFilterState,
  /**
   * The resolved NodeType for `item.node_id` in the current frame_version.
   * P0-19: InterviewItem only carries the id, so the caller must look up
   * the type to apply the Checkpoint/Term/Interpretation filter chips.
   * Pass undefined (or omit) to skip node-type filtering — handy for the
   * existing pure-helper tests that don't need a frame_version in scope.
   */
  node_type?: "Checkpoint" | "Term" | "Interpretation" | string,
): boolean {
  if (state.jurisdictional_scope === "jurisdictional_only" && !item.is_jurisdictional) {
    return false;
  }
  if (state.reasons.length > 0 && !state.reasons.includes(item.reason)) {
    return false;
  }
  // P0-19: chips visibly toggled but the list never changed because this
  // branch wasn't here. Now: if any node-type chips are active, the item's
  // resolved node_type must be in the allowed set. When `node_type` is
  // undefined (test fixtures or pre-resolution callers), node-type
  // filtering is skipped.
  if (state.node_types.length > 0 && node_type !== undefined) {
    if (!(state.node_types as ReadonlyArray<string>).includes(node_type)) return false;
  }
  return true;
}
