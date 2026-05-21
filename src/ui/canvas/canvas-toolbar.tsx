import * as React from "react";
import type { ReactElement } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import {
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  FrameCorners,
  SortAscending,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { IconButton } from "../primitives/icon-button";
import { Z } from "../primitives/z-index";
import type { ForeclosureVisibility } from "./edges/types";

export type { ForeclosureVisibility };

export interface CanvasToolbarProps {
  foreclosure_visibility: ForeclosureVisibility;
  onForeclosureVisibilityChange: (v: ForeclosureVisibility) => void;
  onSearch?: (query: string) => void;
  onAutoArrange?: () => void;
}

// Direct Phosphor glyphs. Mirrors the picks listed in
// docs/handoff/ui_overhaul_mapping_v1.md (UICONS → Phosphor map). The
// IconButton wrapper handles sizing; we just hand it the glyph element.
const ZoomInGlyph = <MagnifyingGlassPlus size={16} aria-hidden />;
const ZoomOutGlyph = <MagnifyingGlassMinus size={16} aria-hidden />;
const FitViewGlyph = <FrameCorners size={16} aria-hidden />;
const AutoArrangeGlyph = <SortAscending size={16} aria-hidden />;
const ForecloseVisibleGlyph = <Eye size={16} aria-hidden />;
const ForecloseDimmedGlyph = <Eye size={16} aria-hidden style={{ opacity: 0.55 }} />;
const ForecloseHiddenGlyph = <EyeSlash size={16} aria-hidden />;

export function CanvasToolbar({
  foreclosure_visibility,
  onForeclosureVisibilityChange,
  onSearch,
  onAutoArrange,
}: CanvasToolbarProps): ReactElement {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const zoom_pct = Math.round(zoom * 100);
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
      data-z-band="canvas-toolbar"
      style={{
        // Floating position is part of the canvas chrome contract; keep the
        // fixed coordinates and the z-band. Visual chrome (background, border,
        // radius, shadow, padding) reads from tokens.css which still owns the
        // pill-shaped surface treatment for floating toolbars.
        position: "absolute",
        top: "var(--space-3)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z.canvasToolbar,
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
        {ZoomInGlyph}
      </IconButton>
      <IconButton size="sm" aria-label="Zoom out" onClick={() => zoomOut()}>
        {ZoomOutGlyph}
      </IconButton>
      <IconButton size="sm" aria-label="Fit to screen" onClick={() => fitView()}>
        {FitViewGlyph}
      </IconButton>
      <IconButton
        size="sm"
        aria-label={`Zoom to 100% (currently ${zoom_pct}%)`}
        onClick={() => zoomTo(1)}
      >
        <span style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-medium)" }}>
          {zoom_pct}%
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
        // Plain <input> — the capture-phase keydown handler in frame-canvas.tsx
        // checks `tag === "INPUT"` to skip the edge-creation hotkey. shadcn
        // Input renders as a real <input> too, but we keep the .argmap-input
        // class so it shares the form-field token sizing already living in
        // global.css (which is protected).
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
