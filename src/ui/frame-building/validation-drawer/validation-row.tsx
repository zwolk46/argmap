import type { ReactElement } from "react";
import type { FrameVersion, ValidationResult } from "@/schema";
import { VALIDATION_RULE_DESCRIPTIONS } from "@/schema";
import { SeverityIcon, humanizeValidationMessage } from "../../primitives";
import { UIcon } from "../../primitives/uicon";

export interface ValidationRowProps {
  result: ValidationResult;
  is_dismissed: boolean;
  on_jump_to_node: (node_id: string) => void;
  on_dismiss: () => void;
  on_restore: () => void;
  frame_version?: FrameVersion | null;
}

export function ValidationRow(props: ValidationRowProps): ReactElement {
  const { result, is_dismissed, on_jump_to_node, on_dismiss, on_restore, frame_version } = props;
  const display_message = humanizeValidationMessage(result.message, frame_version ?? null);

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
          flex: 1,
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-primary, #111827)",
        }}
        // P2: hover shows the rule's intent instead of the bare rule_id
        // (the rule_id is a meaningless string to the user).
        title={VALIDATION_RULE_DESCRIPTIONS[result.rule_id] ?? result.rule_id}
      >
        {display_message}
      </span>

      {/* KEEP RAW: validation-row inline action icons (task spec lists validation-row explicitly). */}
      {/* Jump to node */}
      {result.node_id && (
        <button
          type="button"
          onClick={() => on_jump_to_node(result.node_id!)}
          aria-label="Jump to node"
          title="Jump to node"
          style={ACTION_BTN_STYLE}
        >
          <UIcon name="arrow-up-right" size={14} />
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
            <UIcon name="rotate-left" size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={on_dismiss}
            aria-label="Dismiss warning"
            title="Dismiss warning"
            style={ACTION_BTN_STYLE}
          >
            <UIcon name="times" size={14} />
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
  padding: "0 var(--space-1)",
  fontSize: "var(--font-size-sm)",
  flexShrink: 0,
};
