import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType } from "@/schema";
import { TypeIcon } from "@/ui/primitives";
import { cn } from "#lib/utils";

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
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-3 text-left text-sm text-foreground transition-colors",
        // When the surrounding pane is in narrow state, collapse the row
        // to an icon-only column so the palette item is still hittable
        // at 56px. The title attribute supplies the type label on hover.
        "group-data-[pane-state=narrow]/pane:justify-center group-data-[pane-state=narrow]/pane:px-0",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-grab",
      )}
    >
      <TypeIcon node_type={node_type} />
      <span className="group-data-[pane-state=narrow]/pane:hidden">
        {PALETTE_NODE_TYPE_LABELS[node_type]}
      </span>
    </button>
  );
}
