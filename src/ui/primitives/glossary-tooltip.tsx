import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { Tooltip } from "./tooltip";

export interface GlossaryTerm {
  term: string;
  definition: string;
  legal_only?: boolean;
}

export const GLOSSARY_DICTIONARY: Record<string, GlossaryTerm> = {
  RootQuestion: {
    term: "Root Question",
    definition:
      "The top-level question the frame is designed to answer. Every other node traces back to this.",
  },
  SubQuestion: {
    term: "Sub-Question",
    definition: "A decomposed question subordinate to the Root Question or another Sub-Question.",
  },
  Term: {
    term: "Term",
    definition: "A defined term that governs interpretation. Terms branch into Interpretations.",
  },
  Interpretation: {
    term: "Interpretation",
    definition: "One reading of a Term. The argument selects one Interpretation per Term.",
  },
  Checkpoint: {
    term: "Checkpoint",
    definition:
      "A factual or inferential question with discrete options. Answering it routes the argument along a path.",
  },
  LogicalGate: {
    term: "Logical Gate",
    definition:
      "A connective (AND/OR/NOT/IF-THEN/UNLESS) that combines or filters paths in the frame.",
  },
  Conclusion: {
    term: "Conclusion",
    definition: "The terminal node that holds the frame's output direction and confidence.",
  },
  Authority: {
    term: "Authority",
    definition:
      "A source (case, statute, regulation, treatise) that supports or contradicts interpretations.",
  },
  Premise: {
    term: "Premise",
    definition:
      "A factual assertion supplied during argument running that supports checkpoints and interpretations.",
  },
  jurisdiction: {
    term: "Jurisdiction",
    definition:
      "The legal system (e.g., SCOTUS, 9th Cir.) within which the frame's authorities are evaluated.",
    legal_only: true,
  },
  binding_authority: {
    term: "Binding Authority",
    definition:
      "Authority that a court must follow under the doctrine of stare decisis in that jurisdiction.",
    legal_only: true,
  },
  persuasive_authority: {
    term: "Persuasive Authority",
    definition: "Authority that a court may consider but is not required to follow.",
    legal_only: true,
  },
  burden_of_proof: {
    term: "Burden of Proof",
    definition:
      "The standard a party must meet to satisfy a checkpoint (e.g., preponderance, clear and convincing, beyond reasonable doubt).",
    legal_only: true,
  },
};

export interface GlossaryTooltipProps {
  entry_key: string;
  children: ReactElement;
}

export function GlossaryTooltip({ entry_key, children }: GlossaryTooltipProps): ReactElement {
  const frame = useFrameStore((s) => s.frame);
  const is_legal = frame?.mode === "legal";

  const entry = GLOSSARY_DICTIONARY[entry_key];
  if (!entry) return children;
  if (entry.legal_only && !is_legal) return children;

  const content = (
    <div>
      <div
        style={{
          fontWeight: "var(--font-weight-semibold)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-1)",
        }}
      >
        {entry.term}
      </div>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
        {entry.definition}
      </div>
    </div>
  );

  return <Tooltip content={content}>{children}</Tooltip>;
}
