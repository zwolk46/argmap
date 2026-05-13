import type { ReactElement } from "react";
import type { NodeType } from "@/schema";

export interface TypeIconProps {
  node_type: NodeType | "premise_pill" | "edge";
  size?: number;
  color?: string;
}

const STROKE = 1.6;

// Carefully-tuned 16×16 monochrome glyphs.
function RootQuestion({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5.4 5.6c.05-1.6 1.25-2.7 2.7-2.7 1.55 0 2.7 1.1 2.7 2.4 0 .95-.55 1.5-1.4 2-.95.55-1.3 1.05-1.3 2v.45" />
      <circle cx="8.1" cy="12.2" r="0.55" fill="currentColor" />
    </svg>
  );
}

function SubQuestion({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4h6M3 8h7M3 12h4" />
      <path d="M11.5 11l1.7 1.7 2.6-2.6" />
    </svg>
  );
}

function Term({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 3.6h8M8 3.6V13" />
    </svg>
  );
}

function Interpretation({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 4v4.5a2 2 0 0 0 2 2H12" />
      <path d="m10 8.5 2.5 2-2.5 2" />
    </svg>
  );
}

function Checkpoint({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2.7h6l3 5.3-3 5.3H5L2 8z" />
    </svg>
  );
}

function LogicalGate({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M3.5 8h9M8 3.5v9" />
    </svg>
  );
}

function Conclusion({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2.4 13.6 8 8 13.6 2.4 8Z" />
      <path d="M8 5.5 11 8l-3 2.5L5 8Z" />
    </svg>
  );
}

function Authority({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2.6h5.5l2.5 2.5V13.4H4Z" />
      <path d="M9.5 2.6V5.1H12" />
      <path d="M6 8.5h4M6 10.7h4" />
    </svg>
  );
}

function PremiseDot({ size }: { size: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" />
    </svg>
  );
}

function EdgeArrow({ size }: { size: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8h10" />
      <path d="m9.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  );
}

const ICON_FOR: Record<string, (props: { size: number }) => ReactElement> = {
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  LogicalGate,
  Conclusion,
  Authority,
  Premise: PremiseDot,
  premise_pill: PremiseDot,
  edge: EdgeArrow,
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
  const Glyph = ICON_FOR[node_type] ?? PremiseDot;
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
      <Glyph size={size} />
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
