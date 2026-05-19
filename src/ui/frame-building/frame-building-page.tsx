import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId, NodeRef, NodeType, Node, Edge, Flavor } from "@/schema";
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
  SignOutButton,
} from "../chrome";
import type { TopBarSlots } from "../chrome";
import { FrameCanvas, useLayoutResult } from "../canvas";
import type { FrameCanvasHandle } from "../canvas";
import { EdgeCreationPopup } from "../canvas/edge-creation-popup";
import { validEdgeTypesFor } from "../canvas/edges/edge-validity";
import type { EdgeCreationCandidate } from "../canvas/edges/edge-validity";
import { Button, LoadingScreen, CanvasEmptyState, useToast, Z } from "../primitives";
import { humanizeNodeType } from "../primitives";
import { SuggestionDrawer } from "../ai-suggestion";
import { useCascadeConfirmation } from "../hooks";
import { useNavigate } from "../routing";
import { ArchitecturalModeChangeDialog, FlavorChangeDialog } from "../mode-change";
import { ConfirmDialog } from "../primitives";
import { ThreePaneLayout } from "./three-pane-layout";
import { NodePalette, OutlineTree, buildNodeDefaults } from "./left-pane";
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
  const { frame_store, repository, autosave, now, generateId } = useRepository();
  // Discrete-field subscriptions avoid the whole-snapshot subscription
  // that caused every page-level patch (drag, edit, validation change) to
  // re-render the entire frame-building tree above FrameCanvas. Each
  // useFrameStore call subscribes to a single slice; React only re-renders
  // when that slice's identity changes.
  const frame = useFrameStore((s) => s.frame);
  const frame_version = useFrameStore((s) => s.frame_version);
  const validation = useFrameStore((s) => s.validation);
  const is_loading = useFrameStore((s) => s.is_loading);
  const error = useFrameStore((s) => s.error);
  const snapshot = React.useMemo(
    () => ({ frame, frame_version, validation, is_loading, error }),
    [frame, frame_version, validation, is_loading, error],
  );
  const navigate = useNavigate();
  const toast = useToast();

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
    // Reset page-local UI state when the user navigates to a different
    // frame so the inspector doesn't render content referencing the
    // prior frame's selection / open dialogs.
    setSelection({ kind: "empty" });
    setValidationDrawerOpen(false);
    setSettingsPanelOpen(false);
    setHelpPaneOpen(false);
    setAutoArrangeOpen(false);
    setSwitchToArgumentNoticeOpen(false);
    setEdgePopup({ open: false, position: { x: 0, y: 0 }, candidates: [] });
    setModeChangeDialog({ open: false });
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
    if (candidates.length === 0) {
      // Tell the user *why* the drag-from-handle did nothing. Without this
      // toast the canvas silently swallows the gesture and the user thinks
      // the connection feature is broken.
      const src_node = fv.nodes.find((n) => n.id === source);
      const tgt_node = fv.nodes.find((n) => n.id === target);
      const src_label = src_node ? humanizeNodeType(src_node.type) : "this";
      const tgt_label = tgt_node ? humanizeNodeType(tgt_node.type) : "that";
      toast.push({
        kind: "warning",
        message: `Can't connect ${src_label} → ${tgt_label}: no valid edge type between these node types.`,
      });
      return;
    }
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

  function handleSelectionChange(
    node_ids: ReadonlyArray<NodeRef>,
    edge_ids?: ReadonlyArray<string>,
  ): void {
    const eids = edge_ids ?? [];
    if (node_ids.length === 0 && eids.length === 0) {
      setSelection({ kind: "empty" });
    } else if (node_ids.length === 1 && eids.length === 0) {
      setSelection({ kind: "node", node_id: node_ids[0] });
    } else if (node_ids.length === 0 && eids.length === 1) {
      // Single-edge selection: route to InspectorEdge so edge conditions
      // and metadata become editable. Without this branch InspectorEdge
      // was unreachable from the canvas.
      setSelection({ kind: "edge", edge_id: eids[0] });
    } else {
      setSelection({ kind: "multi", node_ids, edge_ids: eids });
    }
  }

  const frame_mode = snapshot.frame?.mode ?? "general";
  const frame_flavor = snapshot.frame?.flavor;
  const frame_jurisdiction = snapshot.frame?.jurisdiction_default;

  async function switchToArgumentRunning(): Promise<void> {
    if (!snapshot.frame || !snapshot.frame_version) return;
    try {
      // Prefer the most recently updated session on this frame; if none
      // exists, mint a blank one and route into it. This removes the
      // "Sessions are managed from the Home page" detour.
      const existing = await repository.listSessionsForFrame(frame_id);
      let session_id = existing[0]?.id;
      if (!session_id) {
        const new_session_id = generateId();
        const new_session_version_id = generateId();
        const ts = now();
        const blank_version = {
          id: new_session_version_id,
          session_id: new_session_id,
          version_number: 1,
          created_at: ts,
          is_milestone: true,
          premises: [],
          argument_edges: [],
          checkpoint_responses: [],
          interpretation_selections: [],
          // §8 #1: snapshot the frame this version is authored against.
          frame_version_snapshot: snapshot.frame_version,
        };
        const blank_session = {
          id: new_session_id,
          frame_id,
          frame_version_id: snapshot.frame_version.id,
          frame_version_snapshot: snapshot.frame_version,
          title: `Argument session — ${snapshot.frame.title}`,
          premises: [],
          argument_edges: [],
          checkpoint_responses: [],
          interpretation_selections: [],
          status_map: {},
          created_at: ts,
          updated_at: ts,
          current_version_id: new_session_version_id,
        };
        await repository.saveSession(blank_session as never);
        await repository.saveSessionVersion(blank_version as never);
        session_id = new_session_id;
      }
      navigate({ kind: "argument_running", session_id });
    } catch (err) {
      // Surface the error visibly rather than failing silently. Fall back
      // to the legacy notice so the user has SOME path forward.
      console.error("[frame-building] switch-to-argument failed:", err);
      setSwitchToArgumentNoticeOpen(true);
    }
  }

  async function on_go_home(): Promise<void> {
    // §9 #11: leaving Frame Building while autosave is mid-debounce can drop
    // the in-flight edit because the per-user repository unmounts when the
    // route changes. Mirror on_switch_to_frame in argument-running-page and
    // flush before navigating.
    try {
      await autosave.flushAll();
    } catch {
      // Flush failures already surface via the save-failure toast bridge.
    }
    navigate({ kind: "home" });
  }

  const top_bar_slots: TopBarSlots = {
    home: <HomeButton onClick={() => void on_go_home()} />,
    modeToggle: (
      <OperatingModeToggle
        current_mode="frame_building"
        validation={snapshot.validation}
        onSwitchToArgument={() => void switchToArgumentRunning()}
        onSwitchWithWarnings={() => void switchToArgumentRunning()}
        onValidationBlocked={(errors) => {
          // Without this handler the toggle silently no-ops on errors; the
          // user saw nothing happen and assumed the button was broken. We
          // now both surface the count via toast AND pop open the
          // validation drawer so they can read and fix the errors.
          toast.push({
            kind: "warning",
            message: `Can't switch yet — ${errors.length} validation error${errors.length === 1 ? "" : "s"} on this frame. Fix them in the drawer below.`,
          });
          setValidationDrawerOpen(true);
        }}
      />
    ),
    title: snapshot.frame ? <FrameTitle /> : null,
    chips: (
      <ModeFlavorChip
        mode={frame_mode}
        flavor={frame_flavor}
        jurisdiction={frame_jurisdiction}
        onOpenSettings={() => setSettingsPanelOpen(true)}
      />
    ),
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
        <SignOutButton />
      </>
    ),
  };

  if (snapshot.is_loading) {
    return <LoadingScreen label="Loading frame…" />;
  }

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
                    legal_mode={snapshot.frame?.mode === "legal"}
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
                    on_palette_drop={(node_type, position) => {
                      const defaults = buildNodeDefaults(node_type as NodeType, generateId, now());
                      const positioned: Node = {
                        ...defaults,
                        presentation: {
                          ...(defaults.presentation ?? {}),
                          x: position.x,
                          y: position.y,
                        },
                      } as Node;
                      frame_store.getState().applyPatch({ kind: "node_added", node: positioned });
                    }}
                    on_node_delete_requested={(node_id) => cascade_confirmation.request(node_id)}
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
                          padding: "var(--space-5) var(--space-6)",
                          background: "var(--color-surface-elevated)",
                          color: "var(--color-text-secondary)",
                          borderRadius: "var(--radius-lg)",
                          boxShadow: "var(--shadow-md)",
                          fontSize: "var(--font-size-sm)",
                          lineHeight: "var(--line-height-relaxed)",
                          pointerEvents: "auto",
                          maxWidth: "340px",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-2)",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--color-text-primary)",
                            fontWeight: "var(--font-weight-semibold)",
                            fontSize: "var(--font-size-base)",
                          }}
                        >
                          Start with a Root Question
                        </strong>
                        <span>
                          Drag the <em>Root Question</em> tile from the palette on the left onto the
                          canvas — or click it to drop one in. Every frame builds outward from a
                          single Root Question.
                        </span>
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
                        zIndex: Z.banner,
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
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => navigate({ kind: "home" })}
                    >
                      Back to Home
                    </Button>
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
