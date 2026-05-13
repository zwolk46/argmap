import type { ReactElement } from "react";
import type { OutputViewTab } from "@/state";

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
  return (
    <div
      data-testid="output-view-tabs"
      role="tablist"
      style={{
        display: "flex",
        gap: "var(--space-1, 4px)",
        padding: "var(--space-2, 8px)",
        borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
      }}
    >
      {OUTPUT_VIEW_TAB_ORDER.map((tab) => {
        const active = !computing && tab === current;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={computing}
            data-testid={`output-view-tab-${tab}`}
            data-active={active ? "true" : "false"}
            onClick={() => on_change(tab)}
            style={{
              background: active ? "var(--color-background-accent, #dbeafe)" : "transparent",
              color: active
                ? "var(--color-text-accent, #1d4ed8)"
                : "var(--color-text-secondary, #6b7280)",
              border: "none",
              borderRadius: "var(--border-radius-md, 6px)",
              padding: "4px 10px",
              cursor: computing ? "default" : "pointer",
              fontSize: "var(--font-size-xs, 11px)",
            }}
          >
            {computing ? "Computing…" : TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
