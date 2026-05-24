import type { ReactElement } from "react";
import { Stack, FileText, CaretUpDown } from "@phosphor-icons/react";
import { cn } from "#lib/utils";

export type LeftPaneTab = "nodes" | "premises";

export interface LeftPaneToggleProps {
  tab: LeftPaneTab;
  on_change: (next: LeftPaneTab) => void;
  premise_count: number;
  node_count: number;
}

// VARIANT C — "stacked rail with active swap"
// The active tab gets a full-width labeled card with the count; the
// inactive tab collapses to an icon strip beneath it. Clicking the
// inactive strip swaps which entry is the labeled card.
export function LeftPaneToggle(props: LeftPaneToggleProps): ReactElement {
  const { tab, on_change, premise_count, node_count } = props;

  const active_meta =
    tab === "nodes"
      ? { label: "Nodes", count: node_count, Icon: Stack, hint: "Frame interview list" }
      : { label: "Premises", count: premise_count, Icon: FileText, hint: "Argument premises" };
  const inactive: LeftPaneTab = tab === "nodes" ? "premises" : "nodes";
  const inactive_meta =
    inactive === "nodes"
      ? { label: "Nodes", count: node_count, Icon: Stack }
      : { label: "Premises", count: premise_count, Icon: FileText };

  return (
    <div
      data-testid="left-pane-toggle"
      data-variant="rail-swap"
      className="flex flex-col gap-1"
      role="tablist"
      aria-label="Left pane content"
    >
      <div
        role="tab"
        aria-selected="true"
        data-testid={`left-pane-toggle-${tab}`}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-foreground shadow-sm",
        )}
      >
        <active_meta.Icon size={14} className="shrink-0" />
        <span className="flex-1 text-xs font-medium">{active_meta.label}</span>
        <span className="rounded-full bg-background/60 px-1.5 text-[10px] text-muted-foreground">
          {active_meta.count}
        </span>
        <CaretUpDown size={12} className="text-muted-foreground" />
      </div>
      <button
        type="button"
        role="tab"
        aria-selected="false"
        data-testid={`left-pane-toggle-${inactive}`}
        onClick={() => on_change(inactive)}
        title={`Switch to ${inactive_meta.label}`}
        className="flex w-full items-center gap-2 rounded-md border border-transparent bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <inactive_meta.Icon size={12} className="shrink-0" />
        <span className="flex-1 text-left text-[11px]">{inactive_meta.label}</span>
        <span className="text-[10px] opacity-70">{inactive_meta.count}</span>
      </button>
    </div>
  );
}
