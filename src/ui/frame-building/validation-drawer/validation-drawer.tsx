import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { selectValidationDrawer } from "@/state";
import { Drawer, Pill, IconButton, SeverityIcon } from "../../primitives";
import { ValidationRow } from "./validation-row";
import { dismissalKeyFor, partitionByDismissal } from "./dismissed-warnings";

export interface ValidationDrawerProps {
  open: boolean;
  on_close: () => void;
  on_jump_to_node: (node_id: string) => void;
}

export function ValidationDrawer(props: ValidationDrawerProps): ReactElement {
  const { open, on_close, on_jump_to_node } = props;
  const snapshot = useFrameStore((s) => s);
  const frame_id = snapshot.frame?.id;
  const app_state_store = useAppStateStore((s) => s);
  const { app_state_store: app_store } = useRepository();

  const entries = selectValidationDrawer(snapshot);
  const errors = entries.filter((e) => e.severity === "error");
  const warnings = entries.filter((e) => e.severity === "warning");

  const dismissed_keys = new Set<string>(
    Object.keys(app_state_store.app_state.dismissed_warnings ?? {}),
  );

  const as_results = warnings.map((e) => ({
    rule_id: e.rule_id,
    severity: e.severity as "warning",
    message: e.message,
    node_id: e.node_id,
    edge_id: e.edge_id,
  }));

  // P0-20: pass frame_id so the partition key matches what the dismiss
  // onClick handlers below use. Falling back to "frame" when there's no
  // open frame is a safety net (the drawer shouldn't render in that
  // state anyway).
  const { active, dismissed } = partitionByDismissal(
    as_results,
    dismissed_keys,
    frame_id ?? "frame",
  );

  const [show_dismissed, set_show_dismissed] = React.useState(false);

  return (
    <Drawer
      open={open}
      onClose={on_close}
      side="bottom"
      height="280px"
      aria_label="Validation issues"
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
            background: "var(--color-surface-elevated)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontWeight: "var(--font-weight-semibold)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)",
              letterSpacing: "var(--letter-spacing-tight)",
            }}
          >
            Validation
          </span>
          {errors.length > 0 && (
            <Pill variant="severity_error">
              <SeverityIcon severity="error" size={12} />
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </Pill>
          )}
          {warnings.length > 0 && (
            <Pill variant="severity_warning">
              <SeverityIcon severity="warning" size={12} />
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </Pill>
          )}
          <div style={{ marginLeft: "auto" }}>
            <IconButton size="sm" aria-label="Close validation drawer" onClick={on_close}>
              <svg
                width={14}
                height={14}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", background: "var(--color-surface-pane)" }}>
          {entries.length === 0 && (
            <div
              style={{
                padding: "var(--space-6)",
                textAlign: "center",
                color: "var(--color-status-satisfied)",
                background: "var(--color-status-satisfied-bg)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                margin: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
              }}
            >
              <SeverityIcon severity="pass" size={14} />
              No validation issues
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div>
              <div style={GROUP_LABEL_STYLE}>Errors</div>
              {errors.map((e, i) => (
                <ValidationRow
                  key={`${e.rule_id}-${i}`}
                  result={{
                    rule_id: e.rule_id,
                    severity: "error",
                    message: e.message,
                    node_id: e.node_id,
                    edge_id: e.edge_id,
                  }}
                  is_dismissed={false}
                  on_jump_to_node={on_jump_to_node}
                  on_dismiss={() => {}}
                  on_restore={() => {}}
                  frame_version={snapshot.frame_version}
                />
              ))}
            </div>
          )}

          {/* Active warnings */}
          {active.length > 0 && (
            <div>
              <div style={GROUP_LABEL_STYLE}>Warnings</div>
              {active.map((r, i) => (
                <ValidationRow
                  key={`${r.rule_id}-${i}`}
                  result={r}
                  is_dismissed={false}
                  on_jump_to_node={on_jump_to_node}
                  on_dismiss={() => {
                    const key = dismissalKeyFor(r, frame_id ?? "frame");
                    app_store.getState().dismissWarning(key);
                  }}
                  on_restore={() => {}}
                  frame_version={snapshot.frame_version}
                />
              ))}
            </div>
          )}

          {/* Dismissed warnings */}
          {dismissed.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => set_show_dismissed((v) => !v)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs, 11px)",
                  color: "var(--color-text-secondary, #6b7280)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {/* P2: SVG chevron in place of the ASCII triangle / unicode
                    chevron, matching the rest of the chrome SVG icons. */}
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  style={{
                    transform: show_dismissed ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform var(--duration-fast) var(--ease-standard)",
                  }}
                >
                  <path d="M3.5 2 L7 5 L3.5 8" />
                </svg>
                <span>Dismissed ({dismissed.length})</span>
              </button>
              {show_dismissed &&
                dismissed.map((r, i) => (
                  <ValidationRow
                    key={`dismissed-${r.rule_id}-${i}`}
                    result={r}
                    is_dismissed={true}
                    on_jump_to_node={on_jump_to_node}
                    on_dismiss={() => {}}
                    on_restore={() => {
                      const key = dismissalKeyFor(r, frame_id ?? "frame");
                      app_store.getState().undismissWarning(key);
                    }}
                    frame_version={snapshot.frame_version}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

const GROUP_LABEL_STYLE: React.CSSProperties = {
  padding: "var(--space-3) var(--space-4) var(--space-1)",
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs)",
  color: "var(--color-text-secondary)",
  letterSpacing: "var(--letter-spacing-wide)",
  fontWeight: "var(--font-weight-semibold)",
};
