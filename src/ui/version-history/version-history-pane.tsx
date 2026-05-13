import * as React from "react";
import type { ReactElement } from "react";
import type {
  FrameVersionId,
  SessionVersionId,
  FrameId,
  SessionId,
  NodeRef,
  EdgeRef,
} from "@/schema";
import { useFrameStore, useSessionStore } from "@/state";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from "../primitives";
import { useRoute } from "../routing";
import { PaneTabs, type PaneTabValue } from "./pane-tabs";
import { MilestoneFilter, type MilestoneFilterValue } from "./milestone-filter";
import { VersionTree, type VersionTreeEntityKind } from "./version-tree";
import { SelectionFooter } from "./selection-footer";
import { CompareView } from "./compare-view";
import { RestoreConfirmDialog } from "./restore-confirm-dialog";
import { useVersionHistoryPreview } from "./preview-context";
import { useVersionSummaries } from "./use-version-summaries";

export interface VersionHistoryPaneProps {
  open: boolean;
  onClose: () => void;
  on_navigate_to_entity?: (ref: NodeRef | EdgeRef) => void;
}

export function VersionHistoryPane(props: VersionHistoryPaneProps): ReactElement | null {
  const route = useRoute();
  if (route.kind === "frame_building") {
    return (
      <FrameVariant
        open={props.open}
        onClose={props.onClose}
        frame_id={route.frame_id}
        on_navigate_to_entity={props.on_navigate_to_entity}
      />
    );
  }
  if (route.kind === "argument_running") {
    return (
      <SessionVariant
        open={props.open}
        onClose={props.onClose}
        session_id={route.session_id}
        on_navigate_to_entity={props.on_navigate_to_entity}
      />
    );
  }
  return null;
}

interface FrameVariantProps {
  open: boolean;
  onClose: () => void;
  frame_id: FrameId;
  on_navigate_to_entity?: (ref: NodeRef | EdgeRef) => void;
}

function FrameVariant(props: FrameVariantProps): ReactElement {
  const frame_title = useFrameStore((s) => s.frame?.title ?? "");
  const current_version_id = useFrameStore((s) => s.frame_version?.id ?? null);
  const current_version_number = useFrameStore((s) => s.frame_version?.version_number ?? null);
  const summaries_result = useVersionSummaries({ kind: "frame", frame_id: props.frame_id });

  return (
    <PaneShell
      open={props.open}
      onClose={props.onClose}
      header_title={`Version history${frame_title ? ` · ${frame_title}` : ""}`}
      entity_kind="frame"
      summaries={summaries_result.summaries}
      summaries_status={summaries_result.status}
      current_version_id={current_version_id}
      current_version_number={current_version_number}
      allow_restore={true}
      show_tabs={false}
      on_navigate_to_entity={props.on_navigate_to_entity}
    />
  );
}

interface SessionVariantProps {
  open: boolean;
  onClose: () => void;
  session_id: SessionId;
  on_navigate_to_entity?: (ref: NodeRef | EdgeRef) => void;
}

function SessionVariant(props: SessionVariantProps): ReactElement {
  const session_title = useSessionStore((s) => s.session?.title ?? "");
  const session_current_id = useSessionStore((s) => s.session?.current_version_id ?? null);
  const session_current_number = useSessionStore(
    (s) => s.session_version?.version_number ?? null,
  );
  const session_authored_against = useSessionStore(
    (s) => (s.session?.frame_version_id ?? null) as FrameVersionId | null,
  );
  const frame_current_id = useFrameStore((s) => s.frame_version?.id ?? null);
  const frame_current_number = useFrameStore((s) => s.frame_version?.version_number ?? null);
  const frame_id = useFrameStore((s) => (s.frame?.id ?? null) as FrameId | null);

  const [active_tab, setActiveTab] = React.useState<PaneTabValue>("sessions");

  const session_summaries = useVersionSummaries({
    kind: "session",
    session_id: props.session_id,
  });
  const frame_summaries = useVersionSummaries(
    frame_id
      ? { kind: "frame", frame_id }
      : { kind: "frame", frame_id: "__unused__" as FrameId },
  );

  return (
    <PaneShell
      open={props.open}
      onClose={props.onClose}
      header_title={`Version history${session_title ? ` · ${session_title}` : ""}`}
      entity_kind={active_tab === "sessions" ? "session" : "frame"}
      summaries={
        active_tab === "sessions"
          ? session_summaries.summaries
          : frame_summaries.summaries
      }
      summaries_status={
        active_tab === "sessions" ? session_summaries.status : frame_summaries.status
      }
      current_version_id={
        active_tab === "sessions" ? session_current_id : frame_current_id
      }
      current_version_number={
        active_tab === "sessions" ? session_current_number : frame_current_number
      }
      allow_restore={active_tab === "sessions"}
      show_tabs={true}
      active_tab={active_tab}
      on_tab_change={setActiveTab}
      session_authored_against={active_tab === "frames" ? session_authored_against : undefined}
      on_navigate_to_entity={props.on_navigate_to_entity}
    />
  );
}

interface PaneShellProps {
  open: boolean;
  onClose: () => void;
  header_title: string;
  entity_kind: VersionTreeEntityKind;
  summaries: ReadonlyArray<{
    id: string;
    version_number: number;
    is_milestone: boolean;
    parent_version_id?: string;
    created_at: string;
    change_summary?: string;
  }>;
  summaries_status: "loading" | "ready" | "error";
  current_version_id: string | null;
  current_version_number: number | null;
  allow_restore: boolean;
  show_tabs: boolean;
  active_tab?: PaneTabValue;
  on_tab_change?: (next: PaneTabValue) => void;
  session_authored_against?: FrameVersionId | null;
  on_navigate_to_entity?: (ref: NodeRef | EdgeRef) => void;
}

function PaneShell(props: PaneShellProps): ReactElement {
  const preview = useVersionHistoryPreview();
  const [milestone_filter, setMilestoneFilter] =
    React.useState<MilestoneFilterValue>("all");
  const [selected_version_id, setSelectedVersionId] = React.useState<string | null>(null);
  const [compare_state, setCompareState] = React.useState<{
    from_id: string;
    from_version_number: number;
    to_id: string;
    to_version_number: number;
  } | null>(null);
  const [restore_open, setRestoreOpen] = React.useState(false);

  const route = useRoute();
  const route_key =
    route.kind === "frame_building"
      ? `frame:${route.frame_id}`
      : route.kind === "argument_running"
        ? `session:${route.session_id}`
        : route.kind;
  React.useEffect(() => {
    setSelectedVersionId(null);
    setCompareState(null);
    setMilestoneFilter("all");
  }, [route_key, props.active_tab]);

  const selected_summary =
    props.summaries.find((s) => s.id === selected_version_id) ?? null;

  function handlePreviewClicked(): void {
    if (!selected_summary) return;
    if (props.entity_kind === "frame") {
      if (route.kind !== "frame_building" && route.kind !== "argument_running") return;
      const frame_id =
        route.kind === "frame_building"
          ? route.frame_id
          : (selected_summary as { frame_id?: FrameId }).frame_id ?? null;
      if (!frame_id) return;
      preview.enterFramePreview({
        frame_id,
        version_id: selected_summary.id as FrameVersionId,
        version_number: selected_summary.version_number,
      });
    } else {
      if (route.kind !== "argument_running") return;
      preview.enterSessionPreview({
        session_id: route.session_id,
        version_id: selected_summary.id as SessionVersionId,
        version_number: selected_summary.version_number,
      });
    }
  }

  function handleRestoreClicked(): void {
    if (!selected_summary || !props.allow_restore) return;
    setRestoreOpen(true);
  }

  function handleCompareClicked(): void {
    if (!selected_summary || !props.current_version_id || !props.current_version_number)
      return;
    setCompareState({
      from_id: selected_summary.id,
      from_version_number: selected_summary.version_number,
      to_id: props.current_version_id,
      to_version_number: props.current_version_number,
    });
  }

  return (
    <Drawer open={props.open} onClose={props.onClose} width="520px">
      <DrawerHeader>
        <span data-testid="version-history-header-title">{props.header_title}</span>
        <button
          type="button"
          data-testid="version-history-close"
          onClick={props.onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          ×
        </button>
      </DrawerHeader>
      <DrawerBody>
        {compare_state ? (
          <CompareView
            entity_kind={props.entity_kind}
            from_id={compare_state.from_id as FrameVersionId}
            to_id={compare_state.to_id as FrameVersionId}
            from_version_number={compare_state.from_version_number}
            to_version_number={compare_state.to_version_number}
            on_back={() => setCompareState(null)}
            on_navigate_to_entity={props.on_navigate_to_entity ?? (() => {})}
          />
        ) : (
          <>
            {props.show_tabs && props.active_tab && props.on_tab_change ? (
              <PaneTabs value={props.active_tab} onChange={props.on_tab_change} />
            ) : null}
            <MilestoneFilter value={milestone_filter} onChange={setMilestoneFilter} />
            {props.summaries_status === "loading" ? (
              <div data-testid="version-tree-loading" style={{ padding: 12 }}>
                Loading versions…
              </div>
            ) : props.summaries_status === "error" ? (
              <div
                data-testid="version-tree-error"
                style={{ padding: 12, color: "var(--color-severity-error, #dc2626)" }}
              >
                Failed to load versions
              </div>
            ) : (
              <VersionTree
                entity_kind={props.entity_kind}
                summaries={props.summaries as never}
                current_version_id={props.current_version_id as FrameVersionId | null}
                selected_version_id={selected_version_id as FrameVersionId | null}
                on_select={(id) => setSelectedVersionId(id)}
                milestone_filter={milestone_filter}
                session_authored_against_version_id={
                  props.session_authored_against ?? undefined
                }
              />
            )}
          </>
        )}
      </DrawerBody>
      {compare_state ? null : (
        <DrawerFooter>
          <SelectionFooter
            selected_version_id={selected_version_id as FrameVersionId | null}
            selected_version_number={selected_summary?.version_number ?? null}
            current_version_id={props.current_version_id as FrameVersionId | null}
            current_version_number={props.current_version_number}
            allow_restore={props.allow_restore}
            on_preview_clicked={handlePreviewClicked}
            on_restore_clicked={handleRestoreClicked}
            on_compare_clicked={handleCompareClicked}
          />
        </DrawerFooter>
      )}
      {selected_summary && props.current_version_number !== null ? (
        <RestoreConfirmDialog
          open={restore_open}
          onClose={() => setRestoreOpen(false)}
          entity_kind={props.entity_kind}
          ancestor_version_id={selected_summary.id as FrameVersionId}
          ancestor_version_number={selected_summary.version_number}
          current_version_number={props.current_version_number}
          on_restored={() => {
            setRestoreOpen(false);
            props.onClose();
          }}
        />
      ) : null}
    </Drawer>
  );
}
