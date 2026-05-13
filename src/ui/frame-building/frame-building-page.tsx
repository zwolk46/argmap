import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, NodeRef, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { TopBar, HelpGlossaryPane } from "../chrome";
import type { TopBarSlots } from "../chrome";
import { FrameCanvas, useLayoutResult } from "../canvas";
import type { FrameCanvasHandle } from "../canvas";
import { SuggestionDrawer } from "../ai-suggestion";
import { useCascadeConfirmation } from "../hooks";
import { useNavigate } from "../routing";
import { ThreePaneLayout } from "./three-pane-layout";
import { NodePalette, OutlineTree } from "./left-pane";
import { Inspector } from "./right-pane";
import type { InspectorSelection } from "./right-pane";
import { ValidationDrawer } from "./validation-drawer";
import { CascadeDeleteDialog } from "./cascade-delete-dialog";
import { FrameSettingsPanel } from "./frame-settings";
import { AutoArrangeFlow } from "./auto-arrange";

export interface FrameBuildingPageProps {
  frame_id: FrameId;
  onOpenModeChangeDialog?: () => void;
  onToggleVersionHistory?: () => void;
}

export function FrameBuildingPage(props: FrameBuildingPageProps): ReactElement {
  const { frame_id } = props;
  const { frame_store } = useRepository();
  const snapshot = useFrameStore((s) => s);
  const navigate = useNavigate();

  const [selection, setSelection] = React.useState<InspectorSelection>({ kind: "empty" });
  const [validation_drawer_open, setValidationDrawerOpen] = React.useState(false);
  const [settings_panel_open, setSettingsPanelOpen] = React.useState(false);
  const [help_pane_open, setHelpPaneOpen] = React.useState(false);
  const [auto_arrange_open, setAutoArrangeOpen] = React.useState(false);

  const cascade_confirmation = useCascadeConfirmation();
  const canvas_ref = React.useRef<FrameCanvasHandle>(null);
  const layout_status = useLayoutResult(snapshot.frame_version ?? EMPTY_FRAME_VERSION);
  const layout_result =
    layout_status.kind === "ready"
      ? layout_status.result
      : layout_status.kind === "error"
        ? layout_status.previous_result
        : null;

  React.useEffect(() => {
    frame_store.getState().loadFrame(frame_id);
  }, [frame_id, frame_store]);

  function handleDeleteFrame() {
    navigate({ kind: "home" });
  }

  const top_bar_slots: TopBarSlots = {
    title: snapshot.frame?.title ? (
      <span style={{ fontSize: "var(--font-size-sm, 13px)", fontWeight: 500 }}>
        {snapshot.frame.title}
      </span>
    ) : null,
    indicators: (
      <button
        type="button"
        onClick={() => setValidationDrawerOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--font-size-xs, 11px)",
          color: snapshot.validation.some((v) => v.severity === "error")
            ? "var(--color-danger, #dc2626)"
            : "var(--color-text-secondary, #6b7280)",
          padding: "4px 8px",
        }}
      >
        {snapshot.validation.length > 0
          ? `${snapshot.validation.length} issue${snapshot.validation.length !== 1 ? "s" : ""}`
          : "No issues"}
      </button>
    ),
    buttons: (
      <>
        <button
          type="button"
          onClick={() => setSettingsPanelOpen(true)}
          title="Frame settings"
          style={ICON_BTN_STYLE}
        >
          ⚙
        </button>
        <button
          type="button"
          onClick={() => setHelpPaneOpen((v) => !v)}
          title="Help"
          style={ICON_BTN_STYLE}
        >
          ?
        </button>
      </>
    ),
  };

  if (snapshot.is_loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        Loading…
      </div>
    );
  }

  const frame_version = snapshot.frame_version;

  return (
    <React.Fragment>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <TopBar slots={top_bar_slots} mode="frame-building" />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ThreePaneLayout
            left={
              <React.Fragment>
                <NodePalette />
                <OutlineTree selection={selection} on_selection_change={setSelection} />
              </React.Fragment>
            }
            center={
              frame_version ? (
                <FrameCanvas
                  frame_version={frame_version}
                  layout_result={layout_result}
                  operating_mode="frame_building"
                  on_node_moved={(node_id, x, y) => {
                    frame_store.getState().applyPatch({
                      kind: "node_edited",
                      node_id,
                      partial: { presentation: { x, y } } as unknown as Partial<Node>,
                    });
                  }}
                  handle={canvas_ref}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "var(--color-text-secondary, #6b7280)",
                    fontSize: "var(--font-size-sm, 13px)",
                  }}
                >
                  {snapshot.error ? `Error: ${snapshot.error}` : "No frame loaded"}
                </div>
              )
            }
            right={
              <Inspector
                selection={selection}
                on_select={setSelection}
                on_request_delete={(node_id: NodeRef) => cascade_confirmation.request(node_id)}
                on_open_settings={() => setSettingsPanelOpen(true)}
              />
            }
            bottom={
              validation_drawer_open ? (
                <ValidationDrawer
                  open={validation_drawer_open}
                  on_close={() => setValidationDrawerOpen(false)}
                  on_jump_to_node={(node_id: NodeRef) => setSelection({ kind: "node", node_id })}
                />
              ) : null
            }
          />
        </div>
      </div>

      <CascadeDeleteDialog />

      <FrameSettingsPanel
        open={settings_panel_open}
        on_close={() => setSettingsPanelOpen(false)}
        on_open_mode_change_dialog={
          props.onOpenModeChangeDialog ? (_target) => props.onOpenModeChangeDialog?.() : undefined
        }
        on_delete_frame={handleDeleteFrame}
      />

      <HelpGlossaryPane open={help_pane_open} onClose={() => setHelpPaneOpen(false)} />

      <AutoArrangeFlow open={auto_arrange_open} on_close={() => setAutoArrangeOpen(false)} />

      <SuggestionDrawer store_kind="frame" />
    </React.Fragment>
  );
}

import type { FrameVersion } from "@/schema";

const EMPTY_FRAME_VERSION: FrameVersion = {
  id: "__empty__",
  frame_id: "__empty__",
  version_number: 0,
  created_at: "",
  nodes: [],
  edges: [],
  is_milestone: false,
};

const ICON_BTN_STYLE: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  color: "var(--color-text-secondary, #6b7280)",
  padding: "4px 8px",
};
