import type { ReactElement } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

export function StructuralEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } =
    props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const is_gate = data?.gate_glyph !== undefined;

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
      {is_gate && data?.gate_glyph && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: "var(--font-size-xs)",
              color: "var(--color-edge-structural)",
              background: "var(--color-surface-canvas)",
              padding: "1px 3px",
              borderRadius: "var(--radius-sm)",
              pointerEvents: "none",
            }}
          >
            {data.gate_glyph}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
