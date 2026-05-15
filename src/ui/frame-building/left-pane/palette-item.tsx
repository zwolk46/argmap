import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType } from "@/schema";
import { TypeIcon } from "@/ui/primitives";

export interface PaletteItemProps {
  node_type: NodeType;
  disabled: boolean;
  disabled_reason?: string;
  on_click: () => void;
  on_drag_start: (e: React.DragEvent<HTMLButtonElement>) => void;
}

export const PALETTE_NODE_TYPE_LABELS: Readonly<Record<NodeType, string>> = {
  RootQuestion: "Root Question",
  SubQuestion: "Sub-Question",
  Term: "Term",
  Interpretation: "Interpretation",
  Checkpoint: "Checkpoint",
  LogicalGate: "Logical Gate",
  Conclusion: "Conclusion",
  Authority: "Authority",
  Premise: "Premise",
};

export function PaletteItem(props: PaletteItemProps): ReactElement {
  const { node_type, disabled, disabled_reason, on_click, on_drag_start } = props;

  return (
    // KEEP RAW: draggable palette item — uses native drag with HTMLButtonElement-typed drag handlers.
    <button
      type="button"
      disabled={disabled}
      title={disabled ? disabled_reason : PALETTE_NODE_TYPE_LABELS[node_type]}
      aria-label={PALETTE_NODE_TYPE_LABELS[node_type]}
      draggable={!disabled}
      onDragStart={disabled ? undefined : on_drag_start}
      onClick={disabled ? undefined : on_click}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        width: "100%",
        height: "var(--space-7, 28px)",
        padding: "0 var(--space-3, 12px)",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-sm, 4px)",
        cursor: disabled ? "not-allowed" : "grab",
        opacity: disabled ? 0.4 : 1,
        fontSize: "var(--font-size-sm, 13px)",
        color: "var(--color-text-primary, #111827)",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--color-surface-hover, rgba(0,0,0,0.05))";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <TypeIcon node_type={node_type} />
      <span>{PALETTE_NODE_TYPE_LABELS[node_type]}</span>
    </button>
  );
}
