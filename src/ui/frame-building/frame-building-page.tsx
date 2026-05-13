import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, NodeRef, Node, Edge, Flavor } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import {
  TopBar,
  HelpGlossaryPane,
  HomeButton,
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
import { EdgeCreationPopup } from "../canvas/edge-creation-popup";
import { validEdgeTypesFor } from "../canvas/edges/edge-validity";
import type { EdgeCreationCandidate } from "../canvas/edges/edge-validity";
import { LoadingScreen, CanvasEmptyState } from "../primitives";
import { SuggestionDrawer } from "../ai-suggestion";
import { useCascadeConfirmation } from "../hooks";
import { useNavigate } from "../routing";
import { ArchitecturalModeChangeDialog, FlavorChangeDialog } from "../mode-change";
import { ConfirmDialog } from "../primitives";
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
  const { frame_store, now, generateId } = useRepository();
  const snapshot = useFrameStore((s) => s);
  const navigate = useNavigate();

  const [selection, setSelection] = React.useState<InspectorSelection>({ kind: "empty" });
  const [validation_drawer_open, setValidationDrawerOpen] = React.useState(false);
  const [settings_panel_open, setSettingsPanelOpen] = React.useState(false);
  const [help_pane_open, setHelpPaneOpen] = React.useState(false);
  const [auto_arrange_open, setAutoArrangeOpen] = React.useState(false);
  const [switch_to_argument_notice_open, setSwitchToArgumentNoticeOpen] = React.useState(false);
  const [edge_popup, setEdgePopup] = React.useState<{
    open: boolean;
    position: { x: number; y: number };
    candidates: ReadonlyArray<EdgeCreationCandidate>;
  }>({ open: false, position: { x: 0, y: 0 }, candidates: [] });
  const [mode_change_dialog, setModeChangeDialog] = React.useState<ModeChangeDialogState>({
    open: false,
  });
  const current_flavor = useFrameStore((s) => s.frame?.flavor);

  const cascade_confirmation = useCascadeConfirmation();
  const canvas_ref = React.useRef<FrameCanvasHandle>(null);
  const layout_status = useLayoutResult(snapshot.frame_version ?? EMPTY_FRAME_VERSION);
  // P0-9: fall through to the prior result while ELK recomputes (the
  // "computing" status now carries previous_result) so the canvas doesn't
  // slam every node to (0,0) for the 100–500ms layout pass.
  const layout_result =
    layout_status.kind === "ready"
      ? layout_status.result
      : layout_status.kind === "computing" || layout_status.kind === "error"
        ? layout_status.previous_result
        : null;

  React.useEffect(() => {
    frame_store.getState().loadFrame(frame_id);
  }, [frame_id, frame_store]);

  function handleDeleteFrame() {
    navigate({ kind: "home" });
  }

  function applyCandidate(candidate: EdgeCreationCandidate): void {
    const fv = frame_store.getState().frame_version;
    if (!fv) return;

    if (candidate.kind === "edge") {
      const edge: Edge = {
        id: generateId(),
        type: candidate.edge_type,
        layer: "frame",
        source: candidate.source,
        target: candidate.target,
        created_at: now(),
        updated_at: now(),
      } as Edge;
      frame_store.getState().applyPatch({ kind: "edge_added", edge });
    } else if (candidate.kind === "logical_gate_slot") {
      const edge: Edge = {
        id: generateId(),
        type: "GATES",
        layer: "frame",
        source: candidate.source_node,
        target: candidate.gate_id,
        created_at: now(),
        updated_at: now(),
        ...(candidate.slot ? { slot: candidate.slot } : {}),
      } as Edge;
      frame_store.getState().applyPatch({ kind: "edge_added", edge });
    } else if (candidate.kind === "checkpoint_option_routing") {
      const checkpoint = fv.nodes.find((n) => n.id === candidate.checkpoint_id);
      if (!checkpoint || checkpoint.type !== "Checkpoint" || !("options" in checkpoint)) return;
      const cp = checkpoint as { options: Array<{ id: string; target_node_id?: string }> };
      const next_options = cp.options.map((o) =>
        o.id === candidate.option_id ? { ...o, target_node_id: candidate.target } : o,
      );
      frame_store.getState().applyPatch({
        kind: "node_edited",
        node_id: candidate.checkpoint_id,
        partial: { options: next_options } as unknown as Partial<Node>,
      });
    }
  }

  function handleEdgeCreated(
    source: NodeRef,
    target: NodeRef,
    drop_position?: { x: number; y: number },
  ): void {
    const fv = frame_store.getState().frame_version;
    if (!fv) return;
    const candidates = validEdgeTypesFor(source, target, fv);
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      applyCandidate(candidates[0]);
      return;
    }
    setEdgePopup({
      open: true,
      position: drop_position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      candidates,
    });
  }

  function handleSelectionChange(node_ids: ReadonlyArray<NodeRef>): void {
    if (node_ids.length === 0) {
      setSelection({ kind: "empty" });
    } else if (node_ids.length === 1) {
      setSelection({ kind: "node", node_id: node_ids[0] });
    } else {
      setSelection({ kind: "multi", node_ids, edge_ids: [] });
    }
  }

  const frame_mode = snapshot.frame?.mode ?? "general";
  const frame_flavor = snapshot.frame?.flavor;

  const top_bar_slots: TopBarSlots = {
    home: <HomeButton onClick={() => navigate({ kind: "home" })} />,
    modeToggle: (
      <OperatingModeToggle
        current_mode="frame_building"
        validation={snapshot.validation}
        onSwitchToArgument={() => setSwitchToArgumentNoticeOpen(true)}
        onSwitchWithWarnings={() => setSwitchToArgumentNoticeOpen(true)}
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
                <React.Fragment>
                  <FrameCanvas
                    frame_version={frame_version}
                    layout_result={layout_result}
                    operating_mode="frame_building"
                    selection={
                      selection.kind === "node"
                        ? [selection.node_id]
                        : selection.kind === "multi"
                          ? selection.node_ids
                          : []
                    }
                    on_node_moved={(node_id, x, y) => {
                      frame_store.getState().applyPatch({
                        kind: "node_edited",
                        node_id,
                        partial: { presentation: { x, y } } as unknown as Partial<Node>,
                      });
                    }}
                    on_edge_created={handleEdgeCreated}
                    on_node_delete_requested={(node_id) =>
                      cascade_confirmation.request(node_id)
                    }
                    on_edge_delete_requested={(edge_id) =>
                      frame_store.getState().applyPatch({ kind: "edge_removed", edge_id })
                    }
                    onSelectionChange={handleSelectionChange}
                    onAutoArrange={() => setAutoArrangeOpen(true)}
                    handle={canvas_ref}
                  />
                  {/* P1: empty-but-loaded frame has zero nodes — give the user
                      a hint where to start. */}
                  {frame_version.nodes.length === 0 ? (
                    <div
                      data-testid="empty-frame-hint"
                      style={{
                        position: "absolute",
                        inset: "0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          padding: "var(--space-4) var(--space-5)",
                          background: "var(--color-surface-elevated)",
                          color: "var(--color-text-secondary)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-sm)",
                          fontSize: "var(--font-size-sm)",
                          pointerEvents: "auto",
                          maxWidth: "320px",
                          textAlign: "center",
                        }}
                      >
                        Add a Root Question from the palette on the left to begin.
                      </div>
                    </div>
                  ) : null}
                  {/* P1: surface layout-worker errors instead of swallowing
                      them and showing a stale graph. */}
                  {layout_status.kind === "error" ? (
                    <div
                      data-testid="layout-error-banner"
                      style={{
                        position: "absolute",
                        top: "var(--space-3)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-severity-warning-bg)",
                        color: "var(--color-severity-warning)",
                        border: "var(--border-thin) solid var(--color-severity-warning)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-xs)",
                        zIndex: 10,
                      }}
                    >
                      Layout pass failed; showing last-known positions.
                    </div>
                  ) : null}
                </React.Fragment>
              ) : (
                <CanvasEmptyState
                  label={snapshot.error ? "We couldn't load this frame" : "No frame loaded"}
                  description={snapshot.error ?? undefined}
                  action={
                    <button
                      type="button"
                      onClick={() => navigate({ kind: "home" })}
                      style={{
                        padding: "6px 14px",
                        background: "var(--color-mode-current-accent)",
                        color: "var(--color-surface-elevated)",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        cursor: "pointer",
                      }}
                    >
                      Back to Home
                    </button>
                  }
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

      <CascadeDeleteDialog cascade={cascade_confirmation} />

      <FrameSettingsPanel
        open={settings_panel_open}
        on_close={() => setSettingsPanelOpen(false)}
        on_open_mode_change_dialog={(target) => setModeChangeDialog({ open: true, target })}
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

      <EdgeCreationPopup
        open={edge_popup.open}
        position={edge_popup.position}
        candidates={edge_popup.candidates}
        onChoose={(candidate) => {
          applyCandidate(candidate);
          setEdgePopup({ open: false, position: { x: 0, y: 0 }, candidates: [] });
        }}
        onDismiss={() => setEdgePopup({ open: false, position: { x: 0, y: 0 }, candidates: [] })}
      />

      <ConfirmDialog
        open={switch_to_argument_notice_open}
        title="Argument-running needs a session"
        confirm_label="Go to Home"
        cancel_label="Stay here"
        onCancel={() => setSwitchToArgumentNoticeOpen(false)}
        onConfirm={() => {
          setSwitchToArgumentNoticeOpen(false);
          navigate({ kind: "home" });
        }}
      >
        Running an argument requires an argument session for this frame. Sessions are managed from
        the Home page. Switch there to open or create one.
      </ConfirmDialog>

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
