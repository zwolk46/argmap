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
  const on_primary_path = data?.on_primary_path === true;

  // Primary-path edges get the mode accent color + thicker stroke so the
  // resolved route from Root Question to Conclusion is visually traceable.
  // Off-path edges stay quiet neutral. Without this distinction the canvas
  // in argument-running mode showed only status badges and the user could
  // not see "the path".
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
      {is_gate && data?.gate_glyph && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: "var(--font-size-xs)",
              color: on_primary_path
                ? "var(--color-mode-current-accent)"
                : "var(--color-edge-structural)",
              background: "var(--color-surface-canvas)",
              padding: "1px 3px",
              borderRadius: "var(--radius-sm)",
              pointerEvents: "none",
              fontWeight: on_primary_path
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-medium)",
            }}
          >
            {data.gate_glyph}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
