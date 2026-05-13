import * as React from "react";
import type { FrameId, NodeRef } from "@/schema";
import {
  useSessionStore,
  useAppStateStore,
  useRepository,
  selectOutputForView,
  type OutputViewTab,
} from "@/state";
import type { FrameCanvasHandle } from "@/ui";
import { OutputViewTabs } from "./output-view-tabs";
import { PathOverlayTab } from "./path-overlay-tab";
import { DecisionTreeTab } from "./decision-tree-tab";
import { ProseTab } from "./prose-tab";
import { OutputEmptyState } from "./output-empty-state";

export type { OutputViewTab };

export interface OutputViewerProps {
  frame_id: FrameId;
  selected_item_id: NodeRef | null;
  on_node_clicked_in_overlay: (node_id: NodeRef) => void;
  frame_canvas_handle?: React.Ref<FrameCanvasHandle>;
  recommended_next_id?: NodeRef | null;
}

function isOutputViewTab(v: string | undefined): v is OutputViewTab {
  return v === "path_overlay" || v === "decision_tree" || v === "prose";
}

export function OutputViewer(props: OutputViewerProps): React.ReactElement {
  const {
    frame_id,
    on_node_clicked_in_overlay,
    frame_canvas_handle,
    recommended_next_id = null,
  } = props;

  const { app_state_store } = useRepository();
  const compute_result = useSessionStore((s) => s.compute_result);
  const session = useSessionStore((s) => s.session);
  const persisted_tab = useAppStateStore(
    (s) => s.app_state.output_view_tab_choice_by_frame?.[frame_id],
  );

  const has_active_path = (compute_result?.output?.primary_path?.length ?? 0) > 0;
  const default_tab: OutputViewTab = has_active_path ? "path_overlay" : "prose";
  const initial_tab: OutputViewTab = isOutputViewTab(persisted_tab) ? persisted_tab : default_tab;
  const [current_tab, setCurrentTab] = React.useState<OutputViewTab>(initial_tab);

  function on_change_tab(next: OutputViewTab): void {
    setCurrentTab(next);
    app_state_store.getState().setOutputViewTabChoice(frame_id, next);
  }

  const payload = useSessionStore((s) => selectOutputForView(s, current_tab));

  if (!compute_result || !session) {
    return (
      <div
        data-testid="output-viewer"
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <OutputViewTabs current={current_tab} on_change={on_change_tab} computing={true} />
        <div style={{ flex: 1, overflow: "auto" }}>
          <OutputEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="output-viewer"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <OutputViewTabs current={current_tab} on_change={on_change_tab} />
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {current_tab === "path_overlay" ? (
          <PathOverlayTab
            frame_version={session.frame_version_snapshot}
            status_map={Object.fromEntries(compute_result.status_map.entries())}
            session={session}
            on_node_clicked={on_node_clicked_in_overlay}
            canvas_ref={frame_canvas_handle}
          />
        ) : current_tab === "decision_tree" ? (
          <DecisionTreeTab
            payload={payload}
            root_node_id_hint={recommended_next_id}
            on_branch_clicked={on_node_clicked_in_overlay}
          />
        ) : (
          <ProseTab payload={payload} />
        )}
      </div>
    </div>
  );
}
