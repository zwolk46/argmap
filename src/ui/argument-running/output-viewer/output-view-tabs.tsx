/**
 * Output viewer tab control. Underline-style tab strip.
 *
 * App convention: use this pattern (underline + role="tab") for VIEW
 * SWITCHERS — controls that change WHAT is shown in the body. Use
 * <SegmentedToggle> (pill style + role="radio") for FILTER controls
 * that narrow a list without changing what kind of thing is shown.
 *
 * Example of each:
 *   View switcher  → output viewer (Path / Tree / Prose)
 *   Filter         → milestone filter (All / Milestones / Drafts)
 */
import * as React from "react";
import type { ReactElement } from "react";
import type { OutputViewTab } from "@/state";
import { Spinner } from "../../primitives";

export type { OutputViewTab };

export const OUTPUT_VIEW_TAB_ORDER: ReadonlyArray<OutputViewTab> = [
  "path_overlay",
  "decision_tree",
  "prose",
];

const TAB_LABELS: Record<OutputViewTab, string> = {
  path_overlay: "Path overlay",
  decision_tree: "Decision tree",
  prose: "Prose",
};

export interface OutputViewTabsProps {
  current: OutputViewTab;
  on_change: (next: OutputViewTab) => void;
  computing?: boolean;
}

export function OutputViewTabs(props: OutputViewTabsProps): ReactElement {
  const { current, on_change, computing = false } = props;

  // L2: ARIA tablist arrow-key navigation. The roving-tabindex pattern means
  // only the active tab is in the tab order; ArrowLeft/Right wraps around
  // the strip and activates the next tab.
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (computing) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") {
        return;
      }
      const idx = OUTPUT_VIEW_TAB_ORDER.indexOf(current);
      if (idx < 0) return;
      let nextIdx = idx;
      if (e.key === "ArrowLeft") {
        nextIdx = (idx - 1 + OUTPUT_VIEW_TAB_ORDER.length) % OUTPUT_VIEW_TAB_ORDER.length;
      } else if (e.key === "ArrowRight") {
        nextIdx = (idx + 1) % OUTPUT_VIEW_TAB_ORDER.length;
      } else if (e.key === "Home") {
        nextIdx = 0;
      } else if (e.key === "End") {
        nextIdx = OUTPUT_VIEW_TAB_ORDER.length - 1;
      }
      const next = OUTPUT_VIEW_TAB_ORDER[nextIdx];
      if (next && next !== current) {
        e.preventDefault();
        on_change(next);
      }
    },
    [computing, current, on_change],
  );

  return (
    <div
      data-testid="output-view-tabs"
      role="tablist"
      onKeyDown={handleKeyDown}
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "center",
        padding: "0 var(--space-4)",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        background: "var(--color-surface-elevated)",
      }}
    >
      {/* KEEP RAW: role="tab" elements with custom selected-tab styling; not a standard Button. */}
      {OUTPUT_VIEW_TAB_ORDER.map((tab) => {
        const active = !computing && tab === current;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={computing}
            data-testid={`output-view-tab-${tab}`}
            data-active={active ? "true" : "false"}
            onClick={() => on_change(tab)}
            className="argmap-output-tab"
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
      {computing ? (
        <div
          data-testid="output-view-tabs-computing"
          aria-live="polite"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <Spinner size={12} decorative />
          <span>Computing…</span>
        </div>
      ) : null}
    </div>
  );
}
