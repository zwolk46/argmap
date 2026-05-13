import * as React from "react";
import type { ReactElement } from "react";
import type { SessionId, NodeRef } from "@/schema";
import { useRepository, useSessionStore, useFrameStore } from "@/state";
import { HelpGlossaryPane, SuggestionDrawer, Dialog, type FrameCanvasHandle } from "@/ui";
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
  on_open_migration_dialog?: () => void;
  on_toggle_version_history?: () => void;
  version_history_open?: boolean;
}

export function ArgumentRunningPage(props: ArgumentRunningPageProps): ReactElement {
  const { session_id } = props;
  const { session_store, frame_store } = useRepository();
  const snapshot = useSessionStore((s) => s);
  const session = snapshot.session;
  const frame_id = session?.frame_id ?? null;

  const [selected_item_id, setSelectedItemId] = React.useState<NodeRef | null>(null);
  const [bottom_panel_expanded, setBottomPanelExpanded] = React.useState(false);
  const [help_pane_open, setHelpPaneOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<InterviewFilterState>(DEFAULT_INTERVIEW_FILTER);
  const [search_text, setSearchText] = React.useState("");
  const [migration_placeholder_open, setMigrationPlaceholderOpen] = React.useState(false);
  const [recompute_counter, setRecomputeCounter] = React.useState(0);

  const canvas_ref = React.useRef<FrameCanvasHandle | null>(null);
  const is_legal = useFrameStore((s) => s.frame?.mode === "legal");

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
    if (props.on_open_migration_dialog) {
      props.on_open_migration_dialog();
    } else {
      setMigrationPlaceholderOpen(true);
    }
  }

  function on_switch_to_frame(): void {
    if (frame_id && typeof window !== "undefined") {
      window.location.hash = `#/frame/${frame_id}`;
    }
  }

  function bumpRecompute(): void {
    setRecomputeCounter((v) => v + 1);
  }

  if (snapshot.is_loading) {
    return (
      <div
        data-testid="argument-running-loading"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        Loading session…
      </div>
    );
  }

  if (!session || !frame_id) {
    return (
      <div
        data-testid="argument-running-empty"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        {snapshot.error ? `Error: ${snapshot.error}` : "No session loaded."}
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
            on_toggle_version_history: props.on_toggle_version_history,
            on_toggle_help: () => setHelpPaneOpen((v) => !v),
            version_history_open: props.version_history_open ?? false,
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
                    recommended_next_id={null}
                  />
                </div>
                {selected_item_id !== null ? (
                  <div
                    data-testid="item-editor-region"
                    style={{
                      flex: 1,
                      minWidth: 320,
                      maxWidth: 440,
                      overflowY: "auto",
                      borderLeft: "var(--border-thin) solid var(--color-border-tertiary)",
                      background: "var(--color-surface-pane)",
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
      <Dialog
        open={migration_placeholder_open}
        onClose={() => setMigrationPlaceholderOpen(false)}
        aria_label="Session migration"
      >
        <div
          data-testid="migration-placeholder-dialog"
          style={{
            padding: "var(--space-4, 16px)",
            maxWidth: 360,
            fontSize: "var(--font-size-sm, 13px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          Session migration UI lands in I.9d. The session continues to operate against its current
          frame version snapshot; data integrity is preserved.
          <div style={{ marginTop: "var(--space-3, 12px)" }}>
            <button
              type="button"
              onClick={() => setMigrationPlaceholderOpen(false)}
              style={{
                background: "var(--color-background-accent, #dbeafe)",
                color: "var(--color-text-accent, #1d4ed8)",
                border: "none",
                borderRadius: "var(--border-radius-md, 6px)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs, 11px)",
                padding: "4px 10px",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </React.Fragment>
  );
}
