import * as React from "react";
import type { ReactElement } from "react";
import {
  TopBar,
  ModeFlavorChip,
  OperatingModeToggle,
  FrameTitle,
  FrameSettingsButton,
  HomeButton,
  VersionHistoryButton,
  HelpButton,
  SignOutButton,
} from "@/ui";
import type { TopBarSlots } from "@/ui";
import { useFrameStore, useRepository } from "@/state";
import { FrameVersionDriftIndicator } from "./frame-version-drift-indicator";
import { StatusSummaryChip } from "./status-summary-chip";

export interface ArgumentRunningTopBarDeps {
  on_switch_to_frame: () => void;
  on_open_migration_dialog: () => void;
  on_toggle_version_history: () => void;
  on_open_session_settings?: () => void;
  on_toggle_help: () => void;
  on_go_home: () => void;
  version_history_open: boolean;
  help_pane_open: boolean;
  title?: string;
}

export function useArgumentRunningTopBarSlots(deps: ArgumentRunningTopBarDeps): TopBarSlots {
  const frame_mode = useFrameStore((s) => s.frame?.mode ?? "general");
  const frame_flavor = useFrameStore((s) => s.frame?.flavor);
  const has_frame = useFrameStore((s) => s.frame !== null);

  return {
    home: <HomeButton onClick={deps.on_go_home} />,
    modeToggle: (
      <OperatingModeToggle
        current_mode="argument_running"
        validation={[]}
        onSwitchToFrame={deps.on_switch_to_frame}
      />
    ),
    title: (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-2)",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {has_frame ? <FrameTitle read_only /> : null}
        {has_frame && deps.title ? (
          <span
            aria-hidden
            style={{
              color: "var(--color-text-tertiary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            /
          </span>
        ) : null}
        {deps.title ? <SessionTitleEditor title={deps.title} /> : null}
      </div>
    ),
    chips: (
      <>
        <ModeFlavorChip mode={frame_mode} flavor={frame_flavor} />
        <FrameVersionDriftIndicator on_open_migration_dialog={deps.on_open_migration_dialog} />
        <StatusSummaryChip />
      </>
    ),
    indicators: null,
    buttons: (
      <>
        <VersionHistoryButton
          active={deps.version_history_open}
          onToggle={deps.on_toggle_version_history}
        />
        <FrameSettingsButton onOpen={deps.on_open_session_settings} />
        <HelpButton active={deps.help_pane_open} onToggle={deps.on_toggle_help} />
        <SignOutButton />
      </>
    ),
  };
}

function SessionTitleEditor({ title }: { title: string }): ReactElement {
  const { session_store } = useRepository();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(title);
  React.useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  function commit() {
    const next = draft.trim();
    if (!next) {
      // Empty / whitespace-only title silently snaps back to the existing
      // value. Reset the draft so the next edit starts from the live title,
      // not the half-deleted state — otherwise the user sees their typing
      // discarded with no explanation.
      setDraft(title);
      setEditing(false);
      return;
    }
    if (next !== title) {
      session_store
        .getState()
        .applyPatch({ kind: "session_metadata_edited", partial: { title: next } });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        data-testid="argument-running-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        style={{
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-medium)",
          fontFamily: "var(--font-sans)",
          color: "var(--color-text-primary)",
          background: "transparent",
          border: "none",
          borderBottom: "var(--border-medium) solid var(--color-mode-current-accent)",
          outline: "none",
          padding: "0",
          width: "240px",
        }}
      />
    );
  }
  return (
    <span
      data-testid="argument-running-title"
      onClick={() => setEditing(true)}
      style={{
        fontSize: "var(--font-size-base)",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--color-text-primary)",
        cursor: "text",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "320px",
      }}
    >
      {title}
    </span>
  );
}

export interface ArgumentRunningTopBarProps {
  deps: ArgumentRunningTopBarDeps;
}

export function ArgumentRunningTopBar(props: ArgumentRunningTopBarProps): ReactElement {
  const slots = useArgumentRunningTopBarSlots(props.deps);
  return <TopBar slots={slots} mode="argument-running" />;
}
