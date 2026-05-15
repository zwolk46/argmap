import type { ReactElement } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { EdgeProps, Edge as RFEdge } from "@xyflow/react";
import type { FrameCanvasEdgeData } from "./types";

export function CheckpointOptionEdge(props: EdgeProps<RFEdge<FrameCanvasEdgeData>>): ReactElement {
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

  const on_primary_path = data?.on_primary_path === true;
  const stroke = on_primary_path
    ? "var(--color-mode-current-accent)"
    : "var(--color-edge-structural)";
  const strokeWidth = on_primary_path ? 2.25 : 1;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth,
          transition:
            "stroke var(--duration-medium) var(--ease-standard), stroke-width var(--duration-medium) var(--ease-standard)",
        }}
      />
      {data?.option_label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: "var(--font-size-2xs)",
              color: on_primary_path
                ? "var(--color-mode-current-accent)"
                : "var(--color-text-secondary)",
              background: "var(--color-surface-canvas)",
              padding: "1px var(--space-1)",
              borderRadius: "var(--radius-sm)",
              border: on_primary_path
                ? "var(--border-thin) solid var(--color-mode-current-accent)"
                : "var(--border-hairline) solid var(--color-border-subtle)",
              pointerEvents: "none",
              fontWeight: on_primary_path
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-medium)",
            }}
          >
            {data.option_label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
