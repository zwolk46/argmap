import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType } from "@/schema";
import { TypeIcon } from "@/ui/primitives";
import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";

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
  const label = PALETTE_NODE_TYPE_LABELS[node_type];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={disabled && disabled_reason ? disabled_reason : label}
        aria-disabled={disabled || undefined}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          title={disabled ? disabled_reason : label}
          draggable={!disabled}
          onDragStart={disabled ? undefined : on_drag_start}
          onClick={disabled ? undefined : on_click}
          className={disabled ? "cursor-not-allowed opacity-40" : "cursor-grab"}
        >
          <TypeIcon node_type={node_type} />
          <span>{label}</span>
        </button>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
