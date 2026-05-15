import type { ReactElement } from "react";
import type { FrameVersion, ValidationResult } from "@/schema";
import { VALIDATION_RULE_DESCRIPTIONS } from "@/schema";
import { SeverityIcon, IconButton, humanizeValidationMessage } from "../../primitives";
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
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3)",
        opacity: is_dismissed ? 0.5 : 1,
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
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
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
        }}
        // P2: hover shows the rule's intent instead of the bare rule_id
        // (the rule_id is a meaningless string to the user).
        title={VALIDATION_RULE_DESCRIPTIONS[result.rule_id] ?? result.rule_id}
      >
        {display_message}
      </span>

      {result.node_id && (
        <IconButton
          size="sm"
          onClick={() => on_jump_to_node(result.node_id!)}
          aria-label="Jump to node"
          title="Jump to node"
        >
          <UIcon name="arrow-up-right" size={14} />
        </IconButton>
      )}

      {/* Dismiss / Restore (warnings only) */}
      {result.severity === "warning" &&
        (is_dismissed ? (
          <IconButton
            size="sm"
            onClick={on_restore}
            aria-label="Restore warning"
            title="Restore warning"
          >
            <UIcon name="rotate-left" size={14} />
          </IconButton>
        ) : (
          <IconButton
            size="sm"
            onClick={on_dismiss}
            aria-label="Dismiss warning"
            title="Dismiss warning"
          >
            <UIcon name="times" size={14} />
          </IconButton>
        ))}
    </div>
  );
}
