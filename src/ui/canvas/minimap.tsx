import type { ReactElement } from "react";
import { MiniMap } from "@xyflow/react";
import type { Node as RFNode } from "@xyflow/react";
import type { FrameCanvasNodeData } from "./nodes";

export interface CanvasMinimapProps {
  visible?: boolean;
}

const STATUS_FILL: Record<string, string> = {
  satisfied: "hsl(145 36% 38%)",
  open: "hsl(30 6% 70%)",
  contested: "hsl(34 75% 60%)",
  foreclosed: "hsl(30 8% 55%)",
  not_applicable: "hsl(30 5% 80%)",
};

export function CanvasMinimap({ visible = true }: CanvasMinimapProps): ReactElement | null {
  if (!visible) return null;
  return (
    <MiniMap
      pannable
      zoomable
      nodeColor={(n: RFNode<FrameCanvasNodeData>) => {
        const s = n.data?.status?.status;
        if (s && STATUS_FILL[s]) return STATUS_FILL[s];
        return "hsl(30 6% 55%)";
      }}
      nodeStrokeColor="hsl(30 8% 30%)"
      nodeStrokeWidth={1}
      style={{
        background: "var(--color-surface-pane)",
        border: "var(--border-hairline) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
      maskColor="hsla(30 8% 12% / 0.10)"
    />
  );
}
