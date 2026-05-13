import type { ReactElement, CSSProperties } from "react";
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
  const on_path = !!data?.on_primary_path;
  const path_index = data?.path_index ?? 0;

  // P0-17: primary-path edges render solid in the path color with a one-shot
  // fade-in trace (staggered by path_index × 120ms via the CSS variable);
  // off-path overlay edges keep the existing dotted treatment.
  const traceStyle: CSSProperties = on_path
    ? {
        // Boosted stroke width so the resolving path reads as "thicker" in
        // steady state, not just during trace.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ "--trace-stroke-width": Math.max(2.5, stroke_width + 1).toString() } as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ "--path-index": String(path_index) } as any),
        stroke: color,
        strokeWidth: Math.max(2.5, stroke_width + 1),
        strokeLinecap: "round",
      }
    : {
        stroke: color,
        strokeWidth: stroke_width,
        strokeDasharray: "1.5,3",
        strokeLinecap: "round",
      };

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      className={on_path ? "argmap-overlay-edge--trace" : undefined}
      style={traceStyle}
    />
  );
}
