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
 *
 * Note: this control uses raw buttons + role="tablist" rather than shadcn
 * <Tabs>. The Radix Tabs primitive does not consistently fire onValueChange
 * under happy-dom's pointer-event synthesis, which breaks the click tests.
 * The visual contract (Tailwind, neutral palette, underline active marker)
 * matches shadcn's <Tabs variant="line"> exactly; the underlying interaction
 * is hand-rolled and fully under our control.
 */
import * as React from "react";
import type { ReactElement } from "react";
import type { OutputViewTab } from "@/state";
import { Spinner } from "../../primitives";
import { cn } from "#lib/utils";

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
      className="flex items-center gap-3 border-b bg-background px-4"
    >
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
            onClick={() => {
              if (computing) return;
              if (tab !== current) on_change(tab);
            }}
            className={cn(
              "relative inline-flex items-center justify-center px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none",
              "text-foreground/60 hover:text-foreground",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:rounded-sm",
              "disabled:opacity-50 disabled:pointer-events-none",
              "data-[active=true]:text-foreground",
              "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:transition-opacity",
              "data-[active=true]:after:opacity-100",
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
      {computing ? (
        <div
          data-testid="output-view-tabs-computing"
          aria-live="polite"
          className="ml-auto flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner size={12} decorative />
          <span>Computing…</span>
        </div>
      ) : null}
    </div>
  );
}
