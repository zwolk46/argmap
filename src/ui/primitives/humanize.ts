import type { NodeType, FrameVersion } from "@/schema";

export const NODE_TYPE_LABELS: Readonly<Record<NodeType, string>> = {
  RootQuestion: "Root Question",
  SubQuestion: "Sub-Question",
  Term: "Term",
  Interpretation: "Interpretation",
  Checkpoint: "Checkpoint",
  LogicalGate: "Logic Gate",
  Conclusion: "Conclusion",
  Authority: "Authority",
  Premise: "Premise",
};

export function humanizeNodeType(type: NodeType | string | undefined): string {
  if (!type) return "Node";
  return (NODE_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

const GATE_TYPE_LABELS: Readonly<Record<string, string>> = {
  AndGate: "All-of (AND)",
  OrGate: "Any-of (OR)",
  NotGate: "Not (NOT)",
  IfThenGate: "If-then",
  UnlessGate: "Unless",
  AND: "All-of (AND)",
  OR: "Any-of (OR)",
  NOT: "Not (NOT)",
  IF_THEN: "If-then",
  UNLESS: "Unless",
};

export function humanizeGateType(type: string | undefined): string {
  if (!type) return "Gate";
  return GATE_TYPE_LABELS[type] ?? type;
}

const FIELD_NAME_LABELS: Readonly<Record<string, string>> = {
  position_id: "position",
  gate_type: "gate type",
  authority_ref: "authority",
  target_node_id: "target",
  selected_option_id: "selected option",
  premise_type: "premise type",
  burden_of_proof: "burden of proof",
  // P1 humanization gaps from audit
  linked_to: "linked term",
  is_jurisdictional: "jurisdictional flag",
  requires_premise: "premise requirement",
  requires_authority: "authority requirement",
  answer_type: "answer type",
  output_target: "gate output",
  jurisdiction_override: "jurisdiction override",
};

// Internal terminology that leaks into validation messages and reads like
// machine output to a law student. Each entry is a phrase replacement (run
// before the field-name pass so multi-word terms collapse first).
const PHRASE_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  // V-EDGE-3 / V-FR-* — "Argument-layer edge" is internal jargon.
  [/\bArgument-layer edge\b/g, "Argument-running edge"],
  // V-EDGE-3 — "Frame Version.edges" / "FrameVersion.edges" → "the frame's edges".
  [/\bFrame ?Version\.edges\b/g, "the frame's edges"],
  // V-NODE-8 — "satisfies but has no target" → "marked satisfying but with no target node".
  [/\bsatisfies\s+but\s+has\s+no\s+target\b/g, "is marked satisfying but has no target node"],
  // V-FR-3 trailing fragment artifact "(s)".
  [/\bInterpretation\(s\)\b/g, "Interpretations"],
  // V-FR-2 awkward "Orphan node" jargon.
  [/\bOrphan node\b/g, "Disconnected node"],
];

// Edge-type enum codes that show up in V-EDGE-1 messages naked.
const EDGE_TYPE_LABELS: Readonly<Record<string, string>> = {
  DECOMPOSES_INTO: "decomposes into",
  TURNS_ON: "turns on",
  INTERPRETED_AS: "interpreted as",
  LEADS_TO: "leads to",
  FORECLOSES: "forecloses",
  GATES: "gates",
  ANSWERS: "answers",
  SUPPORTS: "supports",
  CONTRADICTS: "contradicts",
  CITES: "cites",
  BINDING_IN: "binding in",
  DISTINGUISHED_BY: "distinguished by",
};

export function humanizeFieldName(name: string): string {
  return FIELD_NAME_LABELS[name] ?? name.replace(/_/g, " ");
}

function previewText(node: { id: string } & Record<string, unknown>): string {
  const text =
    (typeof node["question"] === "string" && (node["question"] as string)) ||
    (typeof node["statement"] === "string" && (node["statement"] as string)) ||
    (typeof node["name"] === "string" && (node["name"] as string)) ||
    (typeof node["citation"] === "string" && (node["citation"] as string)) ||
    "";
  if (!text) return humanizeNodeType((node as { type?: string }).type ?? "Node");
  const trimmed = text.trim();
  if (trimmed.length <= 48) return trimmed;
  return trimmed.slice(0, 45).trimEnd() + "…";
}

const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;

export function humanizeValidationMessage(
  message: string,
  frame_version: FrameVersion | null | undefined,
): string {
  let out = message;

  if (frame_version) {
    const node_index = new Map<string, { id: string } & Record<string, unknown>>();
    for (const n of frame_version.nodes) {
      node_index.set(n.id, n as unknown as { id: string } & Record<string, unknown>);
    }
    const edge_ids = new Set(frame_version.edges.map((e) => e.id));

    out = out.replace(UUID_RE, (id) => {
      const node = node_index.get(id);
      if (node) return `"${previewText(node)}"`;
      if (edge_ids.has(id)) return "this connection";
      return id;
    });
  }

  // Phrase replacements first so "Frame Version.edges" collapses before
  // "FrameVersion" gets eaten by individual node-type replacements.
  for (const [re, label] of PHRASE_REPLACEMENTS) {
    out = out.replace(re, label);
  }

  for (const code of Object.keys(NODE_TYPE_LABELS) as NodeType[]) {
    const re = new RegExp(`\\b${code}\\b`, "g");
    out = out.replace(re, NODE_TYPE_LABELS[code]);
  }

  for (const [field, label] of Object.entries(FIELD_NAME_LABELS)) {
    const re = new RegExp(`\\b${field}\\b`, "g");
    out = out.replace(re, label);
  }

  for (const [code, label] of Object.entries(EDGE_TYPE_LABELS)) {
    const re = new RegExp(`\\b${code}\\b`, "g");
    out = out.replace(re, label);
  }

  return out;
}
