import type { ReactElement } from "react";
import { MiniMap } from "@xyflow/react";

export interface CanvasMinimapProps {
  visible?: boolean;
}

export function CanvasMinimap({ visible = true }: CanvasMinimapProps): ReactElement | null {
  if (!visible) return null;
  return (
    <MiniMap
      style={{
        background: "var(--color-surface-pane)",
        border: "var(--border-thin) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
      maskColor="var(--xy-minimap-mask-background-color)"
    />
  );
}
