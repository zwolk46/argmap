// @vitest-environment happy-dom
import * as React from "react";
import type { ReactElement } from "react";
import { TypeIcon } from "@/ui/primitives";
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

export function OutlineTreeRow(props: OutlineTreeRowProps): ReactElement {
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
      style={{
        display: "flex",
        alignItems: "center",
        paddingLeft: `${indent}px`,
        paddingTop: "var(--space-1, 4px)",
        paddingBottom: "var(--space-1, 4px)",
        paddingRight: "var(--space-2, 8px)",
        background: selected ? "var(--color-surface-selected, #e0e7ff)" : "transparent",
        outline: focused ? "2px solid var(--color-focus-ring, #6366f1)" : "none",
        cursor: "pointer",
        fontSize: "var(--font-size-sm, 13px)",
        gap: "var(--space-2, 8px)",
        minHeight: "28px",
        userSelect: "none",
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={on_focus}
    >
      {/* Expand chevron */}
      <span
        style={{
          width: "16px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: has_children ? (expanded ? "rotate(90deg)" : "rotate(0deg)") : "none",
          opacity: has_children ? 1 : 0,
          transition: "transform 150ms ease",
          cursor: has_children ? "pointer" : "default",
        }}
        onClick={has_children ? handleChevronClick : undefined}
        aria-hidden="true"
      >
        {has_children ? "›" : ""}
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
          color: "var(--color-text-primary, #111827)",
        }}
        title={outline_node.primary_text}
      >
        {outline_node.primary_text}
      </span>
    </div>
  );
}
