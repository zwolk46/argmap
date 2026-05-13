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
        gap: "var(--space-3)",
        alignItems: "stretch",
        padding: "0 var(--space-4)",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        background: "var(--color-surface-elevated)",
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
              background: "transparent",
              color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              border: "none",
              borderBottom: active
                ? "var(--border-medium) solid var(--color-mode-current-accent)"
                : "var(--border-medium) solid transparent",
              padding: "var(--space-3) var(--space-2)",
              cursor: computing ? "default" : "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: active
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-medium)",
              transition:
                "color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
              marginBottom: "-1px",
              letterSpacing: "var(--letter-spacing-normal)",
            }}
            onMouseEnter={(e) => {
              if (!active && !computing) {
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
              }
            }}
          >
            {computing ? "Computing…" : TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
