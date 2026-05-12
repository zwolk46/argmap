import type { ReactElement } from "react";
import type { NodeType } from "@/schema";

export interface TypeIconProps {
  node_type: NodeType | "premise_pill" | "edge";
  size?: number;
  color?: string;
}

const GLYPHS: Record<string, string> = {
  RootQuestion: "?",
  SubQuestion: "q",
  Term: "T",
  Interpretation: "↳",
  Checkpoint: "⬡",
  LogicalGate: "⊕",
  Conclusion: "◆",
  Authority: "📄",
  Premise: "•",
  premise_pill: "•",
  edge: "→",
};

export function TypeIcon({ node_type, size = 14, color }: TypeIconProps): ReactElement {
  const glyph = GLYPHS[node_type] ?? "?";
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
        fontSize: size - 2,
        color: color ?? "var(--color-text-secondary)",
        fontFamily: "var(--font-sans)",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}

export function typeIconFor(_node_type: NodeType | "premise_pill" | "edge"): typeof TypeIcon {
  return TypeIcon;
}
