import type { ReactElement } from "react";
import type { NodeType } from "@/schema";
import { UIcon } from "./uicon";

/**
 * TypeIcon — per-node-type glyph used in the palette, the canvas nodes,
 * the Inspector header, the outline tree, and anywhere a node type is
 * surfaced. We use the same Flaticon UI icon set (`fi fi-rr-*`) as the
 * rest of the app so chrome and content share one visual vocabulary —
 * the previous custom SVGs read as a separate hand on the same screen.
 *
 * Icon choices are semantic (not just "looks ok"):
 *   RootQuestion   — interrogation  : the seeded question that opens the frame
 *   SubQuestion    — list-check     : decomposed sub-claims, a checklist of branches
 *   Term           — hashtag        : a named term whose definition is contested
 *   Interpretation — comment-alt-middle : one reading of a term — a competing voice
 *   Checkpoint     — flag-alt       : the binary/branching decision point
 *   LogicalGate    — circuit        : Boolean composition of inputs
 *   Conclusion     — trophy         : the resolved end of the path
 *   Authority      — book-alt       : a cited source
 *   Premise        — circle-small   : an individual fact brought into the session
 *   edge           — arrow-right    : a directional connection
 */
export interface TypeIconProps {
  node_type: NodeType | "premise_pill" | "edge";
  size?: number;
  color?: string;
}

const ICON_NAME_FOR: Record<string, string> = {
  RootQuestion: "interrogation",
  SubQuestion: "list-check",
  Term: "hashtag",
  Interpretation: "comment-alt-middle",
  Checkpoint: "flag-alt",
  LogicalGate: "circuit",
  Conclusion: "trophy",
  Authority: "book-alt",
  Premise: "circle-small",
  premise_pill: "circle-small",
  edge: "arrow-right",
};

// Visually-hidden text fallback for the legacy text-glyph testContent contract.
const TEXT_FALLBACK: Record<string, string> = {
  RootQuestion: "?",
  SubQuestion: "q",
  Term: "T",
  Interpretation: "↳",
  Checkpoint: "⬡",
  LogicalGate: "⊕",
  Conclusion: "◆",
  Authority: "§",
  Premise: "•",
  premise_pill: "•",
  edge: "→",
};

export function TypeIcon({ node_type, size = 14, color }: TypeIconProps): ReactElement {
  const icon_name = ICON_NAME_FOR[node_type] ?? "circle-small";
  const fallback = TEXT_FALLBACK[node_type] ?? "?";
  return (
    <span
      data-testid={`type-icon-${node_type}`}
      aria-label={`Node type: ${node_type}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        color: color ?? "var(--color-text-secondary)",
        flexShrink: 0,
        lineHeight: 1,
        position: "relative",
      }}
    >
      <UIcon name={icon_name} size={size} />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {fallback}
      </span>
    </span>
  );
}

export function typeIconFor(_node_type: NodeType | "premise_pill" | "edge"): typeof TypeIcon {
  return TypeIcon;
}
