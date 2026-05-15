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
  frame: {
    term: "Frame",
    definition:
      "The logical structure of a legal question — the nodes and edges. Reusable across many arguments; doesn't change as facts come in.",
  },
  argument_session: {
    term: "Argument session",
    definition:
      "One set of premises, interpretation selections, and answers evaluated against a frame. Sessions hold the facts and choices; the frame holds the logic.",
  },
  primary_path: {
    term: "Primary path",
    definition:
      "The thread from the Root Question to the resolved Conclusion that the runtime followed for this session. Deterministic — same inputs always trace the same path.",
  },
  foreclosure: {
    term: "Foreclosure",
    definition:
      "When an interpretation choice rules out other nodes from the analysis. Foreclosed nodes appear dimmed and don't count toward the resolution.",
  },
  active_set: {
    term: "Active set",
    definition:
      "Nodes the runtime actually visited under your current selections. Nodes outside the active set were short-circuited by interpretation choices or unmet preconditions.",
  },
  orphan: {
    term: "Orphan",
    definition:
      "A session reference (premise, checkpoint answer, interpretation choice) that points at a frame node which has been removed or renamed in the frame's current version. Resolved by Discard / Reattach / Keep during session migration.",
  },
  reattach: {
    term: "Reattach",
    definition:
      "During session migration, redirect a session reference (e.g., a premise's ANSWERS edge) from its original target to a new target node. Used when a node was renamed or replaced rather than deleted.",
  },
  primary_conclusion: {
    term: "Primary conclusion",
    definition:
      "Among multiple reachable Conclusions, the one the runtime picks as the resolved output — by highest satisfied-node count, then binding-authority preference, then lex ordering.",
  },
  satisfaction_policy: {
    term: "Satisfaction policy",
    definition:
      "The rule that decides when a Checkpoint or Interpretation counts as 'satisfied' — burden of proof, authority required, premise type, and similar configurable conditions. Each node carries its own policy.",
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
