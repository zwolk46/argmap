import * as React from "react";
import type { ReactElement } from "react";
import { MiniMap } from "@xyflow/react";
import type { Node as RFNode } from "@xyflow/react";
import type { FrameCanvasNodeData } from "./nodes";

export interface CanvasMinimapProps {
  visible?: boolean;
}

// The minimap reads its node-fill colors at React Flow node-render time, not
// from CSS. We resolve the CSS custom properties once at mount and feed the
// resolved hex/hsl values into the React Flow API. That keeps the minimap on
// the tokens.css palette without xyflow having to learn about CSS vars.
function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function CanvasMinimap({ visible = true }: CanvasMinimapProps): ReactElement | null {
  // We read the token values once per mount. If the user switches themes
  // mid-session this would become stale — not a concern today (we don't
  // ship a theme switcher), but worth knowing.
  const statusFill = React.useMemo<Record<string, string>>(
    () => ({
      satisfied: readCssVar("--color-status-satisfied", "hsl(145 36% 38%)"),
      open: readCssVar("--color-status-open", "hsl(30 6% 70%)"),
      contested: readCssVar("--color-status-contested", "hsl(34 75% 60%)"),
      foreclosed: readCssVar("--color-text-tertiary", "hsl(30 5% 56%)"),
      not_applicable: readCssVar("--color-border-default", "hsl(30 8% 80%)"),
    }),
    [],
  );
  const defaultFill = React.useMemo(
    () => readCssVar("--color-text-tertiary", "hsl(30 5% 56%)"),
    [],
  );
  const strokeColor = React.useMemo(
    () => readCssVar("--color-text-secondary", "hsl(30 6% 38%)"),
    [],
  );
  const maskColor = React.useMemo(
    () => readCssVar("--color-surface-overlay", "hsla(30 8% 12% / 0.10)"),
    [],
  );

  if (!visible) return null;
  return (
    <MiniMap
      pannable
      zoomable
      nodeColor={(n: RFNode<FrameCanvasNodeData>) => {
        const s = n.data?.status?.status;
        if (s && statusFill[s]) return statusFill[s];
        return defaultFill;
      }}
      nodeStrokeColor={strokeColor}
      nodeStrokeWidth={1}
      style={{
        background: "var(--color-surface-pane)",
        border: "var(--border-hairline) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-sm)",
      }}
      maskColor={maskColor}
    />
  );
}
