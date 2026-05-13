import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, NodeRef, Node, Flavor } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import {
  TopBar,
  HelpGlossaryPane,
  VersionHistoryButton,
  FrameSettingsButton,
  HelpButton,
  FrameTitle,
  ModeFlavorChip,
  ValidationIndicator,
  OperatingModeToggle,
} from "../chrome";
import type { TopBarSlots } from "../chrome";
import { FrameCanvas, useLayoutResult } from "../canvas";
import type { FrameCanvasHandle } from "../canvas";
import { LoadingScreen, CanvasEmptyState } from "../primitives";
import { SuggestionDrawer } from "../ai-suggestion";
import { useCascadeConfirmation } from "../hooks";
import { useNavigate } from "../routing";
import { ArchitecturalModeChangeDialog, FlavorChangeDialog } from "../mode-change";
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
  onToggleVersionHistory: () => void;
  version_history_open: boolean;
}

type ModeChangeDialogState =
  | { open: false }
  | { open: true; target: "mode" }
  | { open: true; target: "flavor" };

function inverseFlavor(current: Flavor | undefined): Flavor {
  return current === "personal" ? "academic" : "personal";
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
  const [mode_change_dialog, setModeChangeDialog] = React.useState<ModeChangeDialogState>({
    open: false,
  });
  const current_flavor = useFrameStore((s) => s.frame?.flavor);

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

  const frame_mode = snapshot.frame?.mode ?? "general";
  const frame_flavor = snapshot.frame?.flavor;

  const top_bar_slots: TopBarSlots = {
    modeToggle: (
      <OperatingModeToggle
        current_mode="frame_building"
        validation={snapshot.validation}
      />
    ),
    title: snapshot.frame ? <FrameTitle /> : null,
    chips: <ModeFlavorChip mode={frame_mode} flavor={frame_flavor} />,
    indicators: (
      <ValidationIndicator
        surface="frame_building"
        onOpenDrawer={() => setValidationDrawerOpen((v) => !v)}
      />
    ),
    buttons: (
      <>
        <VersionHistoryButton
          active={props.version_history_open}
          onToggle={props.onToggleVersionHistory}
        />
        <FrameSettingsButton onOpen={() => setSettingsPanelOpen(true)} />
        <HelpButton active={help_pane_open} onToggle={() => setHelpPaneOpen((v) => !v)} />
      </>
    ),
  };

  if (snapshot.is_loading) {
    return <LoadingScreen label="Loading frame…" />;
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
                <CanvasEmptyState
                  label={snapshot.error ? `Error: ${snapshot.error}` : "No frame loaded"}
                />
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
        on_open_mode_change_dialog={(target) =>
          setModeChangeDialog({ open: true, target })
        }
        on_delete_frame={handleDeleteFrame}
      />

      {mode_change_dialog.open && mode_change_dialog.target === "mode" ? (
        <ArchitecturalModeChangeDialog
          open={true}
          onClose={() => setModeChangeDialog({ open: false })}
          target="mode"
        />
      ) : null}
      {mode_change_dialog.open && mode_change_dialog.target === "flavor" ? (
        <FlavorChangeDialog
          open={true}
          onClose={() => setModeChangeDialog({ open: false })}
          target_flavor={inverseFlavor(current_flavor)}
        />
      ) : null}

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

