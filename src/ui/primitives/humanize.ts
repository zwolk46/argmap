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

  for (const code of Object.keys(NODE_TYPE_LABELS) as NodeType[]) {
    const re = new RegExp(`\\b${code}\\b`, "g");
    out = out.replace(re, NODE_TYPE_LABELS[code]);
  }

  for (const [field, label] of Object.entries(FIELD_NAME_LABELS)) {
    const re = new RegExp(`\\b${field}\\b`, "g");
    out = out.replace(re, label);
  }

  return out;
}
