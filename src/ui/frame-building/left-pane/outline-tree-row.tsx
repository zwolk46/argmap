// @vitest-environment happy-dom
import * as React from "react";
import type { ReactElement } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { TypeIcon } from "@/ui/primitives";
import { cn } from "#lib/utils";
import type { OutlineNode } from "./outline-tree-shape";

export interface OutlineTreeRowProps {
  outline_node: OutlineNode;
  depth: number;
  selected: boolean;
  focused: boolean;
  expanded: boolean;
  has_children: boolean;
  on_select: (modifiers: { shift_key: boolean; meta_key: boolean }) => void;
  on_toggle_expanded: () => void;
  on_focus: () => void;
}

// React.memo so a keystroke in the inspector / canvas doesn't re-render
// every outline row. Most props are id-stable; selected / focused /
// expanded flip for at most one row per change.
export const OutlineTreeRow = React.memo(OutlineTreeRowImpl);

function OutlineTreeRowImpl(props: OutlineTreeRowProps): ReactElement {
  const {
    outline_node,
    depth,
    selected,
    focused,
    expanded,
    has_children,
    on_select,
    on_toggle_expanded,
    on_focus,
  } = props;

  const indent = depth * 16; // tree indent step

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    on_select({ shift_key: e.shiftKey, meta_key: e.metaKey || e.ctrlKey });
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation();
    on_toggle_expanded();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      on_select({ shift_key: e.shiftKey, meta_key: e.metaKey || e.ctrlKey });
    } else if (e.key === " ") {
      e.preventDefault();
      on_toggle_expanded();
    }
  }

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={has_children ? expanded : undefined}
      tabIndex={focused ? 0 : -1}
      data-testid={`outline-row-${outline_node.node_id}`}
      data-focused={focused ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-expanded={has_children ? (expanded ? "true" : "false") : undefined}
      className={cn(
        "flex min-h-7 select-none items-center gap-2 pr-2",
        "hover:bg-muted focus:outline-none",
        selected && "bg-accent text-accent-foreground",
      )}
      style={{ paddingLeft: `${indent + 8}px` }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={on_focus}
    >
      {/* Expand chevron. Intentionally not focusable: the parent `treeitem`
          row already owns keyboard focus and handles Space → toggle_expanded
          (see handleKeyDown above). Making the chevron a separate tab stop
          would create a focusable-inside-focusable trap and force users to
          tab into nested controls just to expand a row. `aria-hidden` keeps
          AT from announcing it as a separate control. */}
      <span
        className={cn(
          "flex w-4 shrink-0 items-center justify-center transition-transform",
          has_children ? (expanded ? "rotate-90" : "rotate-0") : "opacity-0",
          has_children ? "cursor-pointer" : "cursor-default",
        )}
        onClick={has_children ? handleChevronClick : undefined}
        aria-hidden="true"
      >
        {has_children ? <CaretRight size={12} /> : null}
      </span>

      {/* Type icon */}
      <span className="flex shrink-0 items-center">
        <TypeIcon node_type={outline_node.node_type} />
      </span>

      {/* Statement preview */}
      <span className="flex-1 truncate text-foreground" title={outline_node.primary_text}>
        {outline_node.primary_text}
      </span>
    </div>
  );
}
