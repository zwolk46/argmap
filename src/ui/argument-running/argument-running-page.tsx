import * as React from "react";
import type { ReactElement } from "react";
import type { SessionId, NodeRef, FrameVersionId } from "@/schema";
import { useRepository, useSessionStore, useFrameStore, selectInterviewItems } from "@/state";
import {
  HelpGlossaryPane,
  SuggestionDrawer,
  type FrameCanvasHandle,
  LoadingScreen,
  EmptyState,
} from "@/ui";
import { SessionMigrationDialog } from "../session-migration";
import { SessionSettingsPanel } from "../session-settings";
import { TutorialTour } from "../tutorial";
import { useNavigate } from "../routing";
import { ArgumentRunningTopBar } from "./top-bar-slots";
import { TwoPaneLayout } from "./two-pane-layout";
import {
  InterviewPane,
  DEFAULT_INTERVIEW_FILTER,
  type InterviewFilterState,
} from "./interview-pane";
import { OutputViewer } from "./output-viewer";
import { ItemEditorHost } from "./item-editors";
import { BottomPanel } from "./bottom-panel";

export interface ArgumentRunningPageProps {
  session_id: SessionId;
  on_toggle_version_history: () => void;
  version_history_open: boolean;
}

export function ArgumentRunningPage(props: ArgumentRunningPageProps): ReactElement {
  const { session_id } = props;
  const { session_store, frame_store, app_state_store } = useRepository();
  const snapshot = useSessionStore((s) => s);
  const session = snapshot.session;
  const frame_id = session?.frame_id ?? null;

  const [selected_item_id, setSelectedItemId] = React.useState<NodeRef | null>(null);
  const [bottom_panel_expanded, setBottomPanelExpanded] = React.useState(false);
  const [help_pane_open, setHelpPaneOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<InterviewFilterState>(DEFAULT_INTERVIEW_FILTER);
  const [search_text, setSearchText] = React.useState("");
  const [migration_dialog_open, setMigrationDialogOpen] = React.useState(false);
  const [session_settings_open, setSessionSettingsOpen] = React.useState(false);
  const [recompute_counter, setRecomputeCounter] = React.useState(0);
  const navigate = useNavigate();

  const canvas_ref = React.useRef<FrameCanvasHandle | null>(null);
  const is_legal = useFrameStore((s) => s.frame?.mode === "legal");
  const frame_current_version_id = useFrameStore(
    (s) => (s.frame_version?.id ?? null) as FrameVersionId | null,
  );

  // P1: bump the recompute-indicator dot whenever compute_result changes,
  // not just on item-editor save. Premise add/edit/delete from the bottom
  // panel and session-authority operations all change compute_result via
  // applyPatch but previously bypassed bumpRecompute, so the indicator
  // never fired for those paths.
  const compute_result_ref = useSessionStore((s) => s.compute_result);
  const last_compute_ref = React.useRef(compute_result_ref);
  React.useEffect(() => {
    if (last_compute_ref.current !== compute_result_ref) {
      last_compute_ref.current = compute_result_ref;
      setRecomputeCounter((c) => c + 1);
    }
  }, [compute_result_ref]);

  // P0-17 ride-along: the interview pane and canvas both want the
  // recommended-next item id. Compute it at the page level so the canvas
  // pulse animation and the interview-pane highlight stay in sync.
  const interview_items = useSessionStore((s) => selectInterviewItems(s));
  const recommended_next_id =
    interview_items.find((it) => it.recommended_next === true)?.node_id ?? null;

  // Mount: load session, then load parent frame for drift comparison.
  React.useEffect(() => {
    session_store.getState().loadSession(session_id);
  }, [session_id, session_store]);

  React.useEffect(() => {
    if (frame_id) {
      frame_store.getState().loadFrame(frame_id);
    }
  }, [frame_id, frame_store]);

  function on_open_migration_dialog(): void {
    if (frame_current_version_id) setMigrationDialogOpen(true);
  }

  function on_switch_to_frame(): void {
    if (frame_id) navigate({ kind: "frame_building", frame_id });
  }

  function bumpRecompute(): void {
    setRecomputeCounter((v) => v + 1);
  }

  if (snapshot.is_loading) {
    return (
      <div data-testid="argument-running-loading">
        <LoadingScreen label="Loading session…" />
      </div>
    );
  }

  if (!session || !frame_id) {
    return (
      <div data-testid="argument-running-empty">
        <EmptyState label={snapshot.error ? `Error: ${snapshot.error}` : "No session loaded."} />
      </div>
    );
  }

  return (
    <React.Fragment>
      <div
        data-testid="argument-running-page"
        style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      >
        <ArgumentRunningTopBar
          deps={{
            on_switch_to_frame,
            on_open_migration_dialog,
            on_open_session_settings: () => setSessionSettingsOpen(true),
            on_toggle_version_history: props.on_toggle_version_history,
            on_toggle_help: () => setHelpPaneOpen((v) => !v),
            on_go_home: () => navigate({ kind: "home" }),
            version_history_open: props.version_history_open,
            help_pane_open,
            title: session.title,
          }}
        />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TwoPaneLayout
            left={
              <InterviewPane
                selected_item_id={selected_item_id}
                on_select_item={(id) => setSelectedItemId(id)}
                filter={filter}
                on_filter_change={setFilter}
                search_text={search_text}
                on_search_change={setSearchText}
                recompute_counter={recompute_counter}
                on_save_milestone={() => session_store.getState().saveSessionMilestone("Milestone")}
              />
            }
            right={
              <div style={{ display: "flex", height: "100%" }}>
                <div style={{ flex: selected_item_id ? 2 : 1, minWidth: 0 }}>
                  <OutputViewer
                    frame_id={frame_id}
                    selected_item_id={selected_item_id}
                    on_node_clicked_in_overlay={(node_id) => setSelectedItemId(node_id)}
                    frame_canvas_handle={canvas_ref}
                    recommended_next_id={recommended_next_id}
                  />
                </div>
                {selected_item_id !== null ? (
                  <div
                    data-testid="item-editor-region"
                    style={{
                      flex: 1,
                      minWidth: 340,
                      maxWidth: 460,
                      overflowY: "auto",
                      borderLeft: "var(--border-hairline) solid var(--color-border-subtle)",
                      background: "var(--color-surface-pane)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <ItemEditorHost
                      selected_item_id={selected_item_id}
                      on_close={() => setSelectedItemId(null)}
                      on_saved={() => {
                        setSelectedItemId(null);
                        bumpRecompute();
                      }}
                    />
                  </div>
                ) : null}
              </div>
            }
            bottom={
              <BottomPanel
                is_expanded={bottom_panel_expanded}
                on_toggle_expanded={() => setBottomPanelExpanded((v) => !v)}
                operating_mode={is_legal ? "legal" : "general"}
                // P0-18: wire the highlight-on-canvas affordance. The
                // BottomPanel plumbs `on_highlight_on_canvas` through Premise
                // and SessionAuthority rows, but the page never connected it,
                // so clicking the crosshair icon on any row was a no-op.
                on_highlight_on_canvas={(ids) =>
                  ids.forEach((id) => canvas_ref.current?.zoomToNode(id))
                }
              />
            }
            bottom_expanded={bottom_panel_expanded}
          />
        </div>
      </div>
      {help_pane_open ? (
        <HelpGlossaryPane open={help_pane_open} onClose={() => setHelpPaneOpen(false)} />
      ) : null}
      <SuggestionDrawer store_kind="session" />
      {migration_dialog_open && frame_current_version_id ? (
        <SessionMigrationDialog
          open={true}
          onClose={() => setMigrationDialogOpen(false)}
          target_frame_version_id={frame_current_version_id}
        />
      ) : null}
      <SessionSettingsPanel
        open={session_settings_open}
        on_close={() => setSessionSettingsOpen(false)}
        on_open_frame_settings={() => {
          setSessionSettingsOpen(false);
          if (frame_id) navigate({ kind: "frame_building", frame_id });
        }}
        on_delete_session={async () => {
          setSessionSettingsOpen(false);
          if (session) {
            await app_state_store.getState().deleteSession(session.id);
            if (frame_id) navigate({ kind: "frame_building", frame_id });
            else navigate({ kind: "home" });
          }
        }}
      />
      <TutorialTour />
    </React.Fragment>
  );
}
