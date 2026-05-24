import type { ReactElement } from "react";
import { Stack, FileText } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger } from "#components/ui/tabs";

export type LeftPaneTab = "nodes" | "premises";

export interface LeftPaneToggleProps {
  tab: LeftPaneTab;
  on_change: (next: LeftPaneTab) => void;
  premise_count: number;
  node_count: number;
}

// VARIANT B — "shadcn Tabs across the pane"
// Tabs primitive renders the full-width tab bar with an animated active
// indicator. Selected tab is signaled by the shadcn surface treatment;
// counts ride alongside the label in a muted pill.
export function LeftPaneToggle(props: LeftPaneToggleProps): ReactElement {
  const { tab, on_change, premise_count, node_count } = props;
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => on_change(v as LeftPaneTab)}
      data-testid="left-pane-toggle"
      data-variant="tabs"
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="nodes"
          data-testid="left-pane-toggle-nodes"
          className="gap-1 text-[11px]"
        >
          <Stack size={12} />
          Nodes
          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {node_count}
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="premises"
          data-testid="left-pane-toggle-premises"
          className="gap-1 text-[11px]"
        >
          <FileText size={12} />
          Premises
          <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
            {premise_count}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
