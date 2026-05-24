import type { ReactElement } from "react";
import { Stack, FileText } from "@phosphor-icons/react";
import { Button } from "#components/ui/button";
import { cn } from "#lib/utils";

export type LeftPaneTab = "nodes" | "premises";

export interface LeftPaneToggleProps {
  tab: LeftPaneTab;
  on_change: (next: LeftPaneTab) => void;
  premise_count: number;
  node_count: number;
}

// VARIANT A — "segmented control in the pane header"
// Mirrors the look of the top-bar OperatingModeToggle (Frame / Argument).
// Two pill buttons share a single rounded container; selected button is
// elevated with the primary surface treatment.
export function LeftPaneToggle(props: LeftPaneToggleProps): ReactElement {
  const { tab, on_change, premise_count, node_count } = props;
  return (
    <div
      data-testid="left-pane-toggle"
      data-variant="segmented"
      className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5"
      role="tablist"
      aria-label="Left pane content"
    >
      <Button
        type="button"
        role="tab"
        aria-selected={tab === "nodes"}
        data-testid="left-pane-toggle-nodes"
        variant={tab === "nodes" ? "default" : "ghost"}
        size="xs"
        onClick={() => on_change("nodes")}
        className={cn(
          "h-6 flex-1 gap-1 text-[10px] uppercase tracking-wide",
          tab === "nodes" ? "shadow-sm" : "text-muted-foreground",
        )}
      >
        <Stack size={12} />
        Nodes
        <span className="opacity-70">·{node_count}</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={tab === "premises"}
        data-testid="left-pane-toggle-premises"
        variant={tab === "premises" ? "default" : "ghost"}
        size="xs"
        onClick={() => on_change("premises")}
        className={cn(
          "h-6 flex-1 gap-1 text-[10px] uppercase tracking-wide",
          tab === "premises" ? "shadow-sm" : "text-muted-foreground",
        )}
      >
        <FileText size={12} />
        Premises
        <span className="opacity-70">·{premise_count}</span>
      </Button>
    </div>
  );
}
