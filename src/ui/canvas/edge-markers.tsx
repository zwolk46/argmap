import type { ReactElement } from "react";

const MARKER_DEFS: ReadonlyArray<{ id: string; cssVar: string }> = [
  { id: "argmap-arrow-structural", cssVar: "var(--color-edge-structural)" },
  { id: "argmap-arrow-forecloses", cssVar: "var(--color-edge-foreclosure)" },
  { id: "argmap-arrow-supports", cssVar: "var(--color-edge-supports)" },
  { id: "argmap-arrow-contradicts", cssVar: "var(--color-edge-contradicts)" },
  { id: "argmap-arrow-answers", cssVar: "var(--color-edge-answers)" },
  { id: "argmap-arrow-annotation", cssVar: "var(--color-edge-annotation)" },
  { id: "argmap-arrow-path", cssVar: "var(--color-mode-current-accent)" },
];

export function EdgeMarkerDefs(): ReactElement {
  return (
    <svg
      aria-hidden
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {MARKER_DEFS.map(({ id, cssVar }) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={cssVar} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export function markerEndFor(
  edge_type: string,
  on_primary_path: boolean,
): string {
  if (on_primary_path) return "url(#argmap-arrow-path)";
  switch (edge_type) {
    case "FORECLOSES":
      return "url(#argmap-arrow-forecloses)";
    case "SUPPORTS":
      return "url(#argmap-arrow-supports)";
    case "CONTRADICTS":
      return "url(#argmap-arrow-contradicts)";
    case "ANSWERS":
      return "url(#argmap-arrow-answers)";
    case "CITES":
    case "DISTINGUISHED_BY":
      return "url(#argmap-arrow-annotation)";
    case "DECOMPOSES_INTO":
    case "TURNS_ON":
    case "INTERPRETED_AS":
    case "LEADS_TO":
    case "GATES":
    case "checkpoint_option":
    default:
      return "url(#argmap-arrow-structural)";
  }
}
