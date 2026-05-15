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

  // Two distinct empty states: payload missing (no resolved session yet) and
  // payload present but with zero conditional branches (which is the normal
  // case for `determinate` / `incomplete` / `contested` outputs — only
  // `conditional` produces real branches). Without the second branch the
  // user saw a blank SVG and called it a "white screen".
  const branches = payload?.decision_tree?.branches ?? null;
  if (!payload || !payload.decision_tree || branches === null || branches.length === 0) {
    const shape = payload?.shape;
    const explanation =
      shape === "determinate"
        ? "This argument resolves to a single conclusion, so there are no branches to display. Switch to Path overlay or Prose to see the resolution."
        : shape === "incomplete"
          ? "The argument isn't resolved yet, so there are no branches. Add premises and answers in the Interview pane on the left, then return here."
          : shape === "contested"
            ? "The argument is contested — competing premises support different conclusions. There aren't conditional branches; switch to Prose for a write-up of the dispute."
            : "There are no conditional branches to display. Decision trees only appear for arguments whose output depends on a future fact (a `conditional` shape).";
    return (
      <div
        data-testid="decision-tree-empty"
        style={{
          padding: "var(--space-4, 16px) var(--space-5, 20px)",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
          lineHeight: "var(--line-height-relaxed, 1.6)",
          maxWidth: 480,
        }}
      >
        {explanation}
      </div>
    );
  }

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
