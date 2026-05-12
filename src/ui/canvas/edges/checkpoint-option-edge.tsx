import type { ReactElement } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

export function CheckpointOptionEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement {
  const {
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, markerEnd,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "var(--color-edge-structural)",
          strokeWidth: 1,
        }}
      />
      {data?.option_label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-secondary)",
              background: "var(--color-surface-canvas)",
              padding: "1px 4px",
              borderRadius: "var(--radius-sm)",
              border: "var(--border-hairline) solid var(--color-border-subtle)",
              pointerEvents: "none",
            }}
          >
            {data.option_label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
