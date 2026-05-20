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
  ValidationIndicator,
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
  const frame_jurisdiction = useFrameStore((s) => s.frame?.jurisdiction_default);
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
      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
        {has_frame ? <FrameTitle read_only /> : null}
        {has_frame && deps.title ? (
          <span aria-hidden className="text-sm text-muted-foreground/70">
            /
          </span>
        ) : null}
        {deps.title ? <SessionTitleEditor title={deps.title} /> : null}
      </div>
    ),
    chips: (
      <>
        {/* #4: pass the session-settings opener so the chip's onOpenSettings
            affordance lands on the right surface in argument-running mode. */}
        <ModeFlavorChip
          mode={frame_mode}
          flavor={frame_flavor}
          jurisdiction={frame_jurisdiction}
          onOpenSettings={deps.on_open_session_settings}
        />
        <FrameVersionDriftIndicator on_open_migration_dialog={deps.on_open_migration_dialog} />
        <StatusSummaryChip />
      </>
    ),
    indicators: <ValidationIndicator surface="argument_running" />,
    buttons: (
      <>
        <VersionHistoryButton
          active={deps.version_history_open}
          onToggle={deps.on_toggle_version_history}
        />
        {/* #1: in Argument Running, this button opens session settings, not
            frame settings — surface the correct label. */}
        <FrameSettingsButton
          onOpen={deps.on_open_session_settings}
          aria_label="Session settings"
          title="Session settings"
        />
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
      // value.
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
        className="w-60 border-0 border-b bg-transparent p-0 text-base font-medium text-foreground outline-none"
        style={{
          borderBottomColor: "var(--color-mode-current-accent)",
          borderBottomWidth: "var(--border-medium)",
        }}
      />
    );
  }
  return (
    <button
      type="button"
      data-testid="argument-running-title"
      onClick={() => setEditing(true)}
      aria-label={`Rename session: ${title}`}
      title="Click to rename"
      className="inline-block max-w-[320px] cursor-text overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent p-0 text-base font-medium text-foreground"
    >
      {title}
    </button>
  );
}

export interface ArgumentRunningTopBarProps {
  deps: ArgumentRunningTopBarDeps;
}

export function ArgumentRunningTopBar(props: ArgumentRunningTopBarProps): ReactElement {
  const slots = useArgumentRunningTopBarSlots(props.deps);
  return <TopBar slots={slots} mode="argument-running" />;
}
