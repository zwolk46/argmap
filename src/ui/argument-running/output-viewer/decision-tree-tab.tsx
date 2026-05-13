import type { ReactElement } from "react";
import type { NodeRef, ConditionalBranch } from "@/schema";
import type { OutputViewPayload } from "@/state";

export interface DecisionTreeNodeBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DecisionTreeTabProps {
  payload: OutputViewPayload | null;
  root_node_id_hint: NodeRef | null;
  on_branch_clicked: (gate_node_id: NodeRef) => void;
}

const DEFAULT_BOX_WIDTH = 200;
const DEFAULT_BOX_HEIGHT = 56;
const DEFAULT_V_GAP = 16;
const DEFAULT_H_GAP = 24;

export function layoutDecisionTreeBranches(
  branches: ReadonlyArray<ConditionalBranch>,
  options?: { box_width?: number; box_height?: number; v_gap?: number; h_gap?: number },
): ReadonlyArray<DecisionTreeNodeBox> {
  const box_w = options?.box_width ?? DEFAULT_BOX_WIDTH;
  const box_h = options?.box_height ?? DEFAULT_BOX_HEIGHT;
  const v_gap = options?.v_gap ?? DEFAULT_V_GAP;
  const _h_gap = options?.h_gap ?? DEFAULT_H_GAP;
  const boxes: DecisionTreeNodeBox[] = [];
  // Deterministic order: branches as supplied. Sort by id for stability.
  const sorted = [...branches].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    boxes.push({
      id: b.id,
      x: _h_gap,
      y: i * (box_h + v_gap),
      w: box_w,
      h: box_h,
    });
  }
  return boxes;
}

export function DecisionTreeTab(props: DecisionTreeTabProps): ReactElement {
  const { payload, root_node_id_hint, on_branch_clicked } = props;
  if (!payload || !payload.decision_tree) {
    return (
      <div
        data-testid="decision-tree-empty"
        style={{
          padding: "var(--space-4, 16px)",
          color: "var(--color-text-tertiary, #9ca3af)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        No conditional branches to display.
      </div>
    );
  }

  const branches = payload.decision_tree.branches;
  const boxes = layoutDecisionTreeBranches(branches);
  const last = boxes.length > 0 ? boxes[boxes.length - 1]! : { y: 0, h: 0 };
  const height = last.y + last.h + DEFAULT_V_GAP;

  return (
    <div
      data-testid="decision-tree-tab"
      style={{
        padding: "var(--space-4, 16px)",
        overflow: "auto",
        height: "100%",
      }}
    >
      <svg data-testid="decision-tree-svg" width="100%" height={height} style={{ minHeight: 120 }}>
        {branches.map((b, i) => {
          const box = boxes[i]!;
          const highlight = root_node_id_hint
            ? b.conditions.some((c) => c.gate_node_id === root_node_id_hint)
            : false;
          return (
            <g
              key={b.id}
              data-testid={`decision-tree-branch-${b.id}`}
              transform={`translate(${box.x}, ${box.y})`}
              onClick={() => {
                const first = b.conditions[0];
                if (first) on_branch_clicked(first.gate_node_id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                width={box.w}
                height={box.h}
                rx={6}
                ry={6}
                fill={
                  highlight
                    ? "var(--color-background-accent, #dbeafe)"
                    : "var(--color-surface-elevated, #ffffff)"
                }
                stroke="var(--color-border-secondary, #d1d5db)"
              />
              <text x={8} y={20} fontSize={11} fill="var(--color-text-primary, #111827)">
                {b.conditions.map((c) => c.required_value_label).join(" · ") || "(no conditions)"}
              </text>
              <text x={8} y={40} fontSize={11} fill="var(--color-text-secondary, #6b7280)">
                → {b.resulting_conclusion}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
