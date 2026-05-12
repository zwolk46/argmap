import type { ReactElement } from "react";
import { BaseEdge, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

export function AnnotationEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement {
  const {
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    markerEnd,
  } = props;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: "var(--color-edge-annotation)",
        strokeWidth: 0.5,
      }}
    />
  );
}
