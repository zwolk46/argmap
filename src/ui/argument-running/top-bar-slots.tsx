import * as React from "react";
import type { ReactElement } from "react";
import { TopBar, ModeFlavorChip, OperatingModeToggle } from "@/ui";
import type { TopBarSlots } from "@/ui";
import { useFrameStore } from "@/state";
import { FrameVersionDriftIndicator } from "./frame-version-drift-indicator";
import { StatusSummaryChip } from "./status-summary-chip";

export interface ArgumentRunningTopBarDeps {
  on_switch_to_frame: () => void;
  on_open_migration_dialog: () => void;
  on_toggle_version_history: () => void;
  on_open_session_settings?: () => void;
  on_toggle_help: () => void;
  version_history_open: boolean;
  help_pane_open: boolean;
  title?: string;
}

export function useArgumentRunningTopBarSlots(deps: ArgumentRunningTopBarDeps): TopBarSlots {
  // This is a hook-shaped helper — must be called from a component context.
  const frame_mode = useFrameStore((s) => s.frame?.mode ?? "general");
  const frame_flavor = useFrameStore((s) => s.frame?.flavor);

  return {
    modeToggle: (
      <OperatingModeToggle
        current_mode="argument_running"
        validation={[]}
        onSwitchToFrame={deps.on_switch_to_frame}
      />
    ),
    title: deps.title ? (
      <span
        style={{
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: 500,
          color: "var(--color-text-primary, #111827)",
        }}
        data-testid="argument-running-title"
      >
        {deps.title}
      </span>
    ) : null,
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
        <button
          type="button"
          data-testid="argument-running-session-settings"
          onClick={deps.on_open_session_settings}
          disabled={!deps.on_open_session_settings}
          title={
            deps.on_open_session_settings
              ? "Session settings"
              : "Session settings — available in I.9d"
          }
          style={icon_btn_style()}
        >
          ⚙
        </button>
        <button
          type="button"
          data-testid="argument-running-version-history"
          onClick={deps.on_toggle_version_history}
          aria-pressed={deps.version_history_open}
          title="Version history"
          style={icon_btn_style()}
        >
          ⟳
        </button>
        <button
          type="button"
          data-testid="argument-running-help"
          onClick={deps.on_toggle_help}
          aria-pressed={deps.help_pane_open}
          title="Help"
          style={icon_btn_style()}
        >
          ?
        </button>
      </>
    ),
  };
}

export interface ArgumentRunningTopBarProps {
  deps: ArgumentRunningTopBarDeps;
}

export function ArgumentRunningTopBar(props: ArgumentRunningTopBarProps): ReactElement {
  const slots = useArgumentRunningTopBarSlots(props.deps);
  return <TopBar slots={slots} mode="argument-running" />;
}

function icon_btn_style(): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "var(--color-text-secondary, #6b7280)",
    padding: "4px 8px",
  };
}
