// @vitest-environment happy-dom
import * as React from "react";
import type { ReactElement } from "react";
import { TypeIcon, UIcon } from "@/ui/primitives";
import type { OutlineNode } from "./outline-tree-shape";

export interface OutlineTreeRowProps {
  outline_node: OutlineNode;
  depth: number;
  selected: boolean;
  focused: boolean;
  expanded: boolean;
  has_children: boolean;
  on_select: () => void;
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

  const indent = depth * 16; // --space-3 ≈ 12px; use 16 for clarity

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    on_select();
  }

  function handleChevronClick(e: React.MouseEvent) {
    e.stopPropagation();
    on_toggle_expanded();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      on_select();
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
      className="tree-row argmap-outline-row"
      style={{
        paddingLeft: `${indent + 8}px`,
        minHeight: "28px",
        userSelect: "none",
      }}
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
        style={{
          width: "16px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: has_children ? (expanded ? "rotate(90deg)" : "rotate(0deg)") : "none",
          opacity: has_children ? 1 : 0,
          transition: "transform var(--duration-fast) var(--ease-standard)",
          cursor: has_children ? "pointer" : "default",
        }}
        onClick={has_children ? handleChevronClick : undefined}
        aria-hidden="true"
      >
        {has_children ? <UIcon name="angle-small-right" size={12} /> : null}
      </span>

      {/* Type icon */}
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <TypeIcon node_type={outline_node.node_type} />
      </span>

      {/* Statement preview */}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--color-text-primary)",
        }}
        title={outline_node.primary_text}
      >
        {outline_node.primary_text}
      </span>
    </div>
  );
}
