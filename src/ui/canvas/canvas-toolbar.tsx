import * as React from "react";
import type { ReactElement } from "react";
import { useReactFlow } from "@xyflow/react";
import { IconButton } from "../primitives/icon-button";
import type { ForeclosureVisibility } from "./edges/types";

export type { ForeclosureVisibility };

export interface CanvasToolbarProps {
  foreclosure_visibility: ForeclosureVisibility;
  onForeclosureVisibilityChange: (v: ForeclosureVisibility) => void;
  onSearch?: (query: string) => void;
  onAutoArrange?: () => void;
}

// Tiny inline SVG icons to keep the toolbar consistent with the icon-set elsewhere.
function Glyph(d: string): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const ZoomIn = Glyph("M8 4v8M4 8h8");
const ZoomOut = Glyph("M4 8h8");
const FitView = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 5V3h2M11 3h2v2M13 11v2h-2M5 13H3v-2" />
  </svg>
);
const AutoArrangeGlyph = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="2" y="2.5" width="5" height="4" rx="1" />
    <rect x="9" y="9.5" width="5" height="4" rx="1" />
    <path d="M4.5 6.5v3M11.5 9.5v-3M4.5 9.5h7" />
  </svg>
);

const ForecloseVisibleGlyph = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M2 8c2-3.5 4.5-5 6-5s4 1.5 6 5c-2 3.5-4.5 5-6 5s-4-1.5-6-5z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const ForecloseDimmedGlyph = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    opacity={0.55}
  >
    <path d="M2 8c2-3.5 4.5-5 6-5s4 1.5 6 5c-2 3.5-4.5 5-6 5s-4-1.5-6-5z" />
  </svg>
);
const ForecloseHiddenGlyph = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M2 4l12 8M2 12c2-3.5 4.5-5 6-5s4 1.5 6 5" opacity={0.55} />
  </svg>
);

export function CanvasToolbar({
  foreclosure_visibility,
  onForeclosureVisibilityChange,
  onSearch,
  onAutoArrange,
}: CanvasToolbarProps): ReactElement {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const [search_value, setSearchValue] = React.useState("");

  const foreclosure_labels: Record<ForeclosureVisibility, string> = {
    visible: "FORECLOSES edges visible — click to dim",
    dimmed: "FORECLOSES edges dimmed — click to hide",
    hidden: "FORECLOSES edges hidden — click to show",
  };

  const next_foreclosure: Record<ForeclosureVisibility, ForeclosureVisibility> = {
    visible: "dimmed",
    dimmed: "hidden",
    hidden: "visible",
  };

  const foreclosureGlyph =
    foreclosure_visibility === "visible"
      ? ForecloseVisibleGlyph
      : foreclosure_visibility === "dimmed"
        ? ForecloseDimmedGlyph
        : ForecloseHiddenGlyph;

  return (
    <div
      data-testid="canvas-toolbar"
      style={{
        position: "absolute",
        top: "var(--space-3)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-pill)",
        border: "var(--border-hairline) solid var(--color-border-subtle)",
        padding: "4px var(--space-2)",
      }}
    >
      <IconButton size="sm" aria-label="Zoom in" onClick={() => zoomIn()}>
        {ZoomIn}
      </IconButton>
      <IconButton size="sm" aria-label="Zoom out" onClick={() => zoomOut()}>
        {ZoomOut}
      </IconButton>
      <IconButton size="sm" aria-label="Fit to screen" onClick={() => fitView()}>
        {FitView}
      </IconButton>
      <IconButton size="sm" aria-label="Zoom to 100%" onClick={() => zoomTo(1)}>
        <span style={{ fontSize: "10px", fontWeight: 500 }}>100%</span>
      </IconButton>
      <span
        aria-hidden
        style={{
          width: 1,
          height: 18,
          background: "var(--color-border-subtle)",
          margin: "0 2px",
        }}
      />
      {onAutoArrange && (
        <IconButton size="sm" aria-label="Auto-arrange" onClick={onAutoArrange}>
          {AutoArrangeGlyph}
        </IconButton>
      )}
      <IconButton
        size="sm"
        aria-label="Toggle FORECLOSES layer"
        title={foreclosure_labels[foreclosure_visibility]}
        onClick={() => onForeclosureVisibilityChange(next_foreclosure[foreclosure_visibility])}
      >
        {foreclosureGlyph}
      </IconButton>
      {onSearch && (
        <input
          aria-label="Search nodes"
          value={search_value}
          onChange={(e) => {
            setSearchValue(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Search…"
          className="argmap-input"
          style={{
            height: "26px",
            padding: "0 var(--space-2)",
            border: "var(--border-thin) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-xs)",
            width: "140px",
            background: "var(--color-surface-pane)",
          }}
        />
      )}
    </div>
  );
}
