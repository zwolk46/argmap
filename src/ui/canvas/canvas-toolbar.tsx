import * as React from "react";
import type { ReactElement } from "react";
import { useReactFlow } from "@xyflow/react";
import { IconButton } from "../primitives/icon-button";
import { UIcon } from "../primitives/uicon";
import type { ForeclosureVisibility } from "./edges/types";

export type { ForeclosureVisibility };

export interface CanvasToolbarProps {
  foreclosure_visibility: ForeclosureVisibility;
  onForeclosureVisibilityChange: (v: ForeclosureVisibility) => void;
  onSearch?: (query: string) => void;
  onAutoArrange?: () => void;
}

const ZoomIn = <UIcon name="zoom-in" size={16} />;
const ZoomOut = <UIcon name="zoom-out" size={16} />;
const FitView = <UIcon name="expand" size={16} />;
const AutoArrangeGlyph = <UIcon name="apps-sort" size={16} />;

const ForecloseVisibleGlyph = <UIcon name="eye" size={16} />;
const ForecloseDimmedGlyph = <UIcon name="eye" size={16} style={{ opacity: 0.55 }} />;
const ForecloseHiddenGlyph = <UIcon name="eye-crossed" size={16} />;

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
        animation: "argmap-overlay-fade-in var(--duration-medium) var(--ease-emphasized)",
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
        <span style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-medium)" }}>
          100%
        </span>
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
            // Compact density override for the floating canvas toolbar (small/square).
            height: "26px",
            padding: "0 var(--space-2)",
            fontSize: "var(--font-size-xs)",
            width: "140px",
            background: "var(--color-surface-pane)",
          }}
        />
      )}
    </div>
  );
}
