import type { ReactElement } from "react";
import { Stack, FileText, type Icon } from "@phosphor-icons/react";
import { cn } from "#lib/utils";

export type LeftPaneTab = "nodes" | "premises";

export interface LeftPaneToggleProps {
  tab: LeftPaneTab;
  on_change: (next: LeftPaneTab) => void;
  premise_count: number;
  node_count: number;
}

// Two equal full-width rail buttons, fixed in position. The selected
// button keeps the primary-tinted card treatment from the variant C
// active card; the unselected button uses the muted/grey strip surface
// that darkens on hover.
export function LeftPaneToggle(props: LeftPaneToggleProps): ReactElement {
  const { tab, on_change, premise_count, node_count } = props;

  return (
    <div
      data-testid="left-pane-toggle"
      data-variant="dual-rail"
      className="flex flex-col gap-1"
      role="tablist"
      aria-label="Left pane content"
    >
      <RailButton
        label="Nodes"
        Icon={Stack}
        count={node_count}
        selected={tab === "nodes"}
        on_click={() => on_change("nodes")}
        test_id="left-pane-toggle-nodes"
      />
      <RailButton
        label="Premises"
        Icon={FileText}
        count={premise_count}
        selected={tab === "premises"}
        on_click={() => on_change("premises")}
        test_id="left-pane-toggle-premises"
      />
    </div>
  );
}

interface RailButtonProps {
  label: string;
  Icon: Icon;
  count: number;
  selected: boolean;
  on_click: () => void;
  test_id: string;
}

function RailButton(props: RailButtonProps): ReactElement {
  const { label, Icon, count, selected, on_click, test_id } = props;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-testid={test_id}
      onClick={on_click}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
        selected
          ? "border-primary/30 bg-primary/10 text-foreground shadow-sm"
          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1 text-left font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px]",
          selected
            ? "bg-background/60 text-muted-foreground"
            : "bg-background/40 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
