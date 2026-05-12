import type { ReactElement } from "react";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

export function ForeclosesEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement | null {
  const {
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, markerEnd,
  } = props;

  const visibility = data?.foreclosure_visibility ?? "visible";
  if (visibility === "hidden") return null;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: "var(--color-edge-foreclosure)",
        strokeWidth: 1.5,
        strokeDasharray: "5,3",
        opacity: visibility === "dimmed" ? 0.4 : 1,
      }}
    />
  );
}
