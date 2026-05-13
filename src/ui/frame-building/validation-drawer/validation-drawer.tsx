import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore, useAppStateStore, useRepository } from "@/state";
import { selectValidationDrawer } from "@/state";
import { Drawer } from "../../primitives";
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

  const { active, dismissed } = partitionByDismissal(as_results, dismissed_keys);

  const [show_dismissed, set_show_dismissed] = React.useState(false);

  return (
    <Drawer open={open} onClose={on_close}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3, 12px)",
            padding: "var(--space-3, 12px) var(--space-4, 16px)",
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm, 13px)" }}>Validation</span>
          {errors.length > 0 && (
            <span
              style={{
                padding: "1px 8px",
                background: "var(--color-danger-subtle, #fef2f2)",
                color: "var(--color-danger, #dc2626)",
                borderRadius: "9999px",
                fontSize: "var(--font-size-xs, 11px)",
                fontWeight: 600,
              }}
            >
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span
              style={{
                padding: "1px 8px",
                background: "var(--color-warning-subtle, #fffbeb)",
                color: "var(--color-warning, #d97706)",
                borderRadius: "9999px",
                fontSize: "var(--font-size-xs, 11px)",
                fontWeight: 600,
              }}
            >
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              onClick={on_close}
              aria-label="Close validation drawer"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "var(--color-text-secondary, #6b7280)",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {entries.length === 0 && (
            <div
              style={{
                padding: "var(--space-6, 24px)",
                textAlign: "center",
                color: "var(--color-text-secondary, #6b7280)",
                fontSize: "var(--font-size-sm, 13px)",
              }}
            >
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
                <span>{show_dismissed ? "▼" : "›"}</span>
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
  padding: "8px 12px 4px",
  textTransform: "uppercase",
  fontSize: "var(--font-size-xs, 11px)",
  color: "var(--color-text-secondary, #6b7280)",
  letterSpacing: "0.05em",
  fontWeight: 600,
};
