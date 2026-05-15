import * as React from "react";
import type { NodeRef } from "@/schema";
import {
  useSessionStore,
  selectInterviewItems,
  selectStatusSummary,
  type InterviewItem,
} from "@/state";
import {
  InterviewFilter,
  DEFAULT_INTERVIEW_FILTER,
  passesFilter,
  type InterviewFilterState,
} from "./interview-filter";
import { InterviewSearch, searchMatches } from "./interview-search";
import { InterviewList } from "./interview-list";
import { RecomputeIndicator } from "./recompute-indicator";
import { InterviewEmptyState } from "./empty-state";
import { statementPreviewFor } from "./interview-row";

export { DEFAULT_INTERVIEW_FILTER, type InterviewFilterState };

export interface InterviewPaneProps {
  selected_item_id: NodeRef | null;
  on_select_item: (id: NodeRef) => void;
  filter: InterviewFilterState;
  on_filter_change: (next: InterviewFilterState) => void;
  search_text: string;
  on_search_change: (next: string) => void;
  recompute_counter: number;
  on_save_milestone: () => void;
  saving_milestone?: boolean;
}

export function InterviewPane(props: InterviewPaneProps): React.ReactElement {
  const {
    selected_item_id,
    on_select_item,
    filter,
    on_filter_change,
    search_text,
    on_search_change,
    recompute_counter,
    on_save_milestone,
    saving_milestone,
  } = props;

  const items: InterviewItem[] = useSessionStore((s) => selectInterviewItems(s));
  const frame_version = useSessionStore((s) => s.session?.frame_version_snapshot ?? null);
  const summary = useSessionStore((s) => selectStatusSummary(s));

  const recommended_next_id = items.find((it) => it.recommended_next === true)?.node_id ?? null;

  // Render-time filter and search; preserves canonical order from the selector.
  // P0-19: resolve each item's node_type so the Checkpoint/Term/Interpretation
  // chips actually filter.
  const filtered = items.filter((item) => {
    const node = frame_version?.nodes.find((n) => n.id === item.node_id);
    if (!passesFilter(item, filter, node?.type)) return false;
    if (search_text.length === 0) return true;
    if (!frame_version) return true;
    if (!node) return false;
    return searchMatches(statementPreviewFor(node), search_text);
  });

  const jurisdictional_items = filtered.filter((it) => it.is_jurisdictional);
  const merits_items = filtered.filter((it) => !it.is_jurisdictional);

  return (
    <div
      data-testid="interview-pane"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
          background: "var(--color-surface-pane)",
        }}
      >
        <RecomputeIndicator counter={recompute_counter} />
        <span
          className="argmap-section-heading"
          style={{
            color: "var(--color-text-secondary)",
          }}
        >
          Open items
        </span>
      </div>
      <InterviewFilter state={filter} on_change={on_filter_change} />
      <InterviewSearch value={search_text} on_change={on_search_change} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {items.length === 0 || !frame_version ? (
          <InterviewEmptyState
            conclusion_label={summary?.conclusion_label}
            on_save_milestone={on_save_milestone}
            saving_milestone={saving_milestone}
          />
        ) : (
          <InterviewList
            jurisdictional_items={jurisdictional_items}
            merits_items={merits_items}
            selected_item_id={selected_item_id}
            recommended_next_id={recommended_next_id}
            on_select_item={on_select_item}
            frame_version={frame_version}
          />
        )}
      </div>
    </div>
  );
}
