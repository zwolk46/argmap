import type { ReactElement } from "react";
import { ArrowUpRight, ArrowCounterClockwise, X } from "@phosphor-icons/react";
import type { FrameVersion, ValidationResult } from "@/schema";
import { VALIDATION_RULE_DESCRIPTIONS } from "@/schema";
import { SeverityIcon, IconButton, humanizeValidationMessage } from "../../primitives";
import { cn } from "#lib/utils";

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
      className={cn(
        "flex items-start gap-2 border-b border-border px-3 py-2",
        "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        is_dismissed && "opacity-50",
      )}
      onKeyDown={(e) => {
        // Only the row itself should trigger jump-to-node; nested IconButtons
        // (Jump, Dismiss, Restore) keep their native Enter handling.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" && result.node_id) {
          on_jump_to_node(result.node_id);
        }
      }}
    >
      <SeverityIcon severity={result.severity} />

      <span
        className="flex-1 text-sm text-foreground"
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
          <ArrowUpRight size={14} />
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
            <ArrowCounterClockwise size={14} />
          </IconButton>
        ) : (
          <IconButton
            size="sm"
            onClick={on_dismiss}
            aria-label="Dismiss warning"
            title="Dismiss warning"
          >
            <X size={14} />
          </IconButton>
        ))}
    </div>
  );
}
