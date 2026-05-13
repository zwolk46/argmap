import type { ReactElement } from "react";
import type { ValidationResult } from "@/schema";
import { SeverityIcon } from "../../primitives";

export interface ValidationRowProps {
  result: ValidationResult;
  is_dismissed: boolean;
  on_jump_to_node: (node_id: string) => void;
  on_dismiss: () => void;
  on_restore: () => void;
}

export function ValidationRow(props: ValidationRowProps): ReactElement {
  const { result, is_dismissed, on_jump_to_node, on_dismiss, on_restore } = props;

  return (
    <div
      role="listitem"
      tabIndex={0}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-2, 8px)",
        padding: "var(--space-2, 8px) var(--space-3, 12px)",
        opacity: is_dismissed ? 0.5 : 1,
        borderBottom: "1px solid var(--color-border, #e5e7eb)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && result.node_id) {
          on_jump_to_node(result.node_id);
        }
      }}
    >
      <SeverityIcon severity={result.severity} />

      <span
        style={{
          fontFamily: "monospace",
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-tertiary, #9ca3af)",
          flexShrink: 0,
          paddingTop: "1px",
        }}
      >
        {result.rule_id}
      </span>

      <span
        style={{
          flex: 1,
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-primary, #111827)",
        }}
      >
        {result.message}
      </span>

      {/* Jump to node */}
      {result.node_id && (
        <button
          type="button"
          onClick={() => on_jump_to_node(result.node_id!)}
          aria-label="Jump to node"
          title="Jump to node"
          style={ACTION_BTN_STYLE}
        >
          ↗
        </button>
      )}

      {/* Dismiss / Restore (warnings only) */}
      {result.severity === "warning" &&
        (is_dismissed ? (
          <button
            type="button"
            onClick={on_restore}
            aria-label="Restore warning"
            title="Restore warning"
            style={ACTION_BTN_STYLE}
          >
            ↺
          </button>
        ) : (
          <button
            type="button"
            onClick={on_dismiss}
            aria-label="Dismiss warning"
            title="Dismiss warning"
            style={ACTION_BTN_STYLE}
          >
            ×
          </button>
        ))}
    </div>
  );
}

import type * as React from "react";

const ACTION_BTN_STYLE: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--color-text-tertiary, #9ca3af)",
  padding: "0 4px",
  fontSize: "14px",
  flexShrink: 0,
};
