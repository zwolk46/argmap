import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { selectValidationDrawer } from "@/state";
import { Drawer, Pill, IconButton, SeverityIcon } from "../../primitives";
import { UIcon } from "../../primitives/uicon";
import { ValidationRow } from "./validation-row";
import { dismissalKeyFor, partitionByDismissal } from "./dismissed-warnings";

export interface ValidationDrawerProps {
  open: boolean;
  on_close: () => void;
  on_jump_to_node: (node_id: string) => void;
}

export function ValidationDrawer(props: ValidationDrawerProps): ReactElement {
  const { open, on_close, on_jump_to_node } = props;
  // Subscribe via narrow selectors — `useFrameStore((s) => s)` /
  // `useAppStateStore((s) => s)` re-render on every patch (drag, edit)
  // including ones that don't touch validation, which is the anti-pattern
  // frame-building-page explicitly avoids.
  const frame_version = useFrameStore((s) => s.frame_version);
  const validation = useFrameStore((s) => s.validation);
  const frame_id = useFrameStore((s) => s.frame?.id);
  const dismissed_warnings = useAppStateStore((s) => s.app_state.dismissed_warnings);
  const { app_state_store: app_store } = useRepository();

  const entries = React.useMemo(
    () =>
      selectValidationDrawer({
        frame_version,
        validation,
      } as Parameters<typeof selectValidationDrawer>[0]),
    [frame_version, validation],
  );
  const errors = entries.filter((e) => e.severity === "error");
  const warnings = entries.filter((e) => e.severity === "warning");

  const dismissed_keys = new Set<string>(Object.keys(dismissed_warnings ?? {}));

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
      height="min(48vh, 480px)"
      aria_label="Frame issues"
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
            Frame issues
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
              <UIcon name="times" size={14} />
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
              <h3
                className="argmap-section-heading"
                style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}
              >
                Errors
              </h3>
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
                  frame_version={frame_version}
                />
              ))}
            </div>
          )}

          {/* Active warnings */}
          {active.length > 0 && (
            <div>
              <h3
                className="argmap-section-heading"
                style={{ padding: "var(--space-3) var(--space-4) var(--space-1)" }}
              >
                Warnings
              </h3>
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
                  frame_version={frame_version}
                />
              ))}
            </div>
          )}

          {/* Dismissed warnings */}
          {dismissed.length > 0 && (
            <div>
              {/* KEEP RAW: full-width accordion header with rotating chevron; bespoke layout, not the standard Button taxonomy. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3) var(--space-2) 0",
                }}
              >
                <button
                  type="button"
                  onClick={() => set_show_dismissed((v) => !v)}
                  aria-expanded={show_dismissed}
                  style={{
                    flex: 1,
                    padding: "var(--space-2) var(--space-3)",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                  }}
                >
                  <UIcon
                    name="angle-small-right"
                    size={12}
                    style={{
                      transform: show_dismissed ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform var(--duration-fast) var(--ease-standard)",
                      display: "inline-block",
                    }}
                  />
                  <span>Dismissed ({dismissed.length})</span>
                </button>
                {show_dismissed ? (
                  <button
                    type="button"
                    data-testid="validation-restore-all"
                    onClick={() => {
                      for (const r of dismissed) {
                        const key = dismissalKeyFor(r, frame_id ?? "frame");
                        app_store.getState().undismissWarning(key);
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "var(--space-1) var(--space-2)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-mode-current-accent)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    Restore all
                  </button>
                ) : null}
              </div>
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
                    frame_version={frame_version}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
