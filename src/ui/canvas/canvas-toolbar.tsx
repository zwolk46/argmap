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

export function CanvasToolbar({
  foreclosure_visibility,
  onForeclosureVisibilityChange,
  onSearch,
  onAutoArrange,
}: CanvasToolbarProps): ReactElement {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const [search_value, setSearchValue] = React.useState("");

  const foreclosure_labels: Record<ForeclosureVisibility, string> = {
    visible: "FORECLOSES: visible",
    dimmed: "FORECLOSES: dimmed",
    hidden: "FORECLOSES: hidden",
  };

  const next_foreclosure: Record<ForeclosureVisibility, ForeclosureVisibility> = {
    visible: "dimmed",
    dimmed: "hidden",
    hidden: "visible",
  };

  return (
    <div
      data-testid="canvas-toolbar"
      style={{
        position: "absolute",
        bottom: "var(--space-4)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        gap: "var(--space-1)",
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--shadow-md)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-1)",
      }}
    >
      <IconButton aria-label="Zoom in" onClick={() => zoomIn()}>+</IconButton>
      <IconButton aria-label="Zoom out" onClick={() => zoomOut()}>−</IconButton>
      <IconButton aria-label="Fit to screen" onClick={() => fitView()}>⊞</IconButton>
      <IconButton aria-label="Zoom to 100%" onClick={() => zoomTo(1)}>100%</IconButton>
      {onAutoArrange && (
        <IconButton aria-label="Auto-arrange" onClick={onAutoArrange}>⟐</IconButton>
      )}
      <IconButton
        aria-label="Toggle FORECLOSES layer"
        title={foreclosure_labels[foreclosure_visibility]}
        onClick={() => onForeclosureVisibilityChange(next_foreclosure[foreclosure_visibility])}
      >
        ⊘
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
          style={{
            padding: "var(--space-1) var(--space-2)",
            border: "var(--border-thin) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-sans)",
            outline: "none",
            width: "120px",
          }}
        />
      )}
    </div>
  );
}
