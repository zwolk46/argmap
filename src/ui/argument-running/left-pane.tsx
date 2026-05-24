import type { ReactElement, ReactNode } from "react";
import { useSessionStore } from "@/state";
import { LeftPaneToggle, type LeftPaneTab } from "./left-pane-toggle";
import { PremisePool } from "./bottom-panel/premise-pool";

export interface LeftPaneProps {
  interview_content: ReactNode;
  tab: LeftPaneTab;
  on_tab_change: (next: LeftPaneTab) => void;
  on_highlight_on_canvas?: (node_ids: ReadonlyArray<string>) => void;
}

/**
 * Argument-running left pane host. Owns the Nodes ↔ Premises toggle and
 * swaps the underlying content. The toggle component is intentionally a
 * sibling import so each preview-variant worktree can replace the toggle
 * UI without touching this file or the page composition.
 */
export function LeftPane(props: LeftPaneProps): ReactElement {
  const { interview_content, tab, on_tab_change, on_highlight_on_canvas } = props;
  const premise_count = useSessionStore((s) => s.session?.premises.length ?? 0);
  const node_count = useSessionStore(
    (s) => s.session?.frame_version_snapshot?.nodes.length ?? 0,
  );

  return (
    <div data-testid="argument-running-left-pane" className="flex h-full flex-col">
      <div className="shrink-0 border-b p-2">
        <LeftPaneToggle
          tab={tab}
          on_change={on_tab_change}
          premise_count={premise_count}
          node_count={node_count}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "nodes" ? (
          interview_content
        ) : (
          <PremisePool on_highlight_on_canvas={on_highlight_on_canvas} />
        )}
      </div>
    </div>
  );
}
