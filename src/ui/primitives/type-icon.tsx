import type { ReactElement } from "react";
import {
  type Icon,
  Question,
  ListChecks,
  TextT,
  ChatCircleDots,
  Flag,
  CirclesThreePlus,
  Trophy,
  BookOpen,
  Circle,
  ArrowRight,
} from "@phosphor-icons/react";
import type { NodeType } from "@/schema";

/**
 * TypeIcon — per-node-type glyph used in the palette, the canvas nodes,
 * the Inspector header, the outline tree, and anywhere a node type is
 * surfaced. Icons are now drawn from Phosphor so chrome and content share
 * one visual vocabulary with the new shadcn primitives.
 *
 * Icon choices are semantic (not just "looks ok"):
 *   RootQuestion   — Question         : the seeded question that opens the frame
 *   SubQuestion    — ListChecks       : decomposed sub-claims, a checklist of branches
 *   Term           — TextT            : a named term whose definition is contested
 *   Interpretation — ChatCircleDots   : one reading of a term — a competing voice
 *   Checkpoint     — Flag             : the binary/branching decision point
 *   LogicalGate    — CirclesThreePlus : Boolean composition of inputs (Phosphor has no clean "circuit")
 *   Conclusion     — Trophy           : the resolved end of the path
 *   Authority      — BookOpen         : a cited source
 *   Premise        — Circle           : an individual fact brought into the session
 *   edge           — ArrowRight       : a directional connection
 */
export interface TypeIconProps {
  node_type: NodeType | "premise_pill" | "edge";
  size?: number;
  color?: string;
}

const ICON_FOR: Record<string, Icon> = {
  RootQuestion: Question,
  SubQuestion: ListChecks,
  Term: TextT,
  Interpretation: ChatCircleDots,
  Checkpoint: Flag,
  LogicalGate: CirclesThreePlus,
  Conclusion: Trophy,
  Authority: BookOpen,
  Premise: Circle,
  premise_pill: Circle,
  edge: ArrowRight,
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
  const Glyph = ICON_FOR[node_type] ?? Circle;
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
      <Glyph size={size} weight="regular" />
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
