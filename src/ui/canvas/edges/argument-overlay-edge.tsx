import type { ReactElement } from "react";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

const EDGE_COLORS: Partial<Record<string, string>> = {
  SUPPORTS: "var(--color-edge-supports)",
  CONTRADICTS: "var(--color-edge-contradicts)",
  ANSWERS: "var(--color-edge-answers)",
};

export function ArgumentOverlayEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } =
    props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = EDGE_COLORS[data?.edge_type ?? ""] ?? "var(--color-edge-answers)";
  const weight_tier = data?.weight_tier ?? 1;
  // Floor at 1px so weights at tier 0 are still visible; spec wants weight to track strength.
  const stroke_width = Math.max(1, 1 + weight_tier * 0.3);

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: stroke_width,
        strokeDasharray: "1.5,3",
        strokeLinecap: "round",
      }}
    />
  );
}
