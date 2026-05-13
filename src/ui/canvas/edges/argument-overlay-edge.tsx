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
  const stroke_width = 0.5 + weight_tier * 0.25;

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: stroke_width,
        strokeDasharray: "3,3",
      }}
    />
  );
}
