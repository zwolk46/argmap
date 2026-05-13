import type { FrameVersion, NodeRef, EdgeType } from "@/schema";
import { VALID_EDGE_PAIRS } from "@/schema";

export type LogicalGateSlot =
  | "inputs"
  | "input"
  | "antecedent"
  | "consequent"
  | "main"
  | "exception";

export type EdgeCreationCandidate =
  | { kind: "edge"; edge_type: EdgeType; source: NodeRef; target: NodeRef }
  | { kind: "logical_gate_slot"; gate_id: NodeRef; slot: LogicalGateSlot; source_node: NodeRef }
  | {
      kind: "checkpoint_option_routing";
      checkpoint_id: NodeRef;
      option_id: string;
      target: NodeRef;
    };

export function validEdgeTypesFor(
  source: NodeRef,
  target: NodeRef,
  frame_version: FrameVersion,
): ReadonlyArray<EdgeCreationCandidate> {
  const source_node = frame_version.nodes.find((n) => n.id === source);
  const target_node = frame_version.nodes.find((n) => n.id === target);
  if (!source_node || !target_node || source === target) return [];

  const candidates: EdgeCreationCandidate[] = [];

  const edge_types = Object.keys(VALID_EDGE_PAIRS) as EdgeType[];
  for (const edge_type of edge_types) {
    if (edge_type === "BINDING_IN") continue;
    const pair = VALID_EDGE_PAIRS[edge_type];
    if (
      (pair.source_types as readonly string[]).includes(source_node.type) &&
      (pair.target_types as readonly string[]).includes(target_node.type)
    ) {
      const already_exists = frame_version.edges.some(
        (e) => e.type === edge_type && e.source === source && e.target === target,
      );
      if (!already_exists) {
        candidates.push({ kind: "edge", edge_type, source, target });
      }
    }
  }

  if (target_node.type === "LogicalGate") {
    const gate = target_node as Extract<typeof target_node, { type: "LogicalGate" }>;
    if ("gate_type" in gate) {
      const gate_type = (gate as { gate_type: string }).gate_type;
      const existing_inputs = frame_version.edges.filter(
        (e) => e.type === "GATES" && e.target === target,
      );

      // P0-8: schema gate_type is "AND" | "OR" | "NOT" | "IF_THEN" | "UNLESS"
      // (per src/schema/nodes.ts). Previous string comparisons used the
      // human-friendly "AndGate"/"OrGate"/etc. forms that never match the
      // canonical enum, so NO slot candidates were ever emitted. Wiring INTO
      // a LogicalGate via drag-edge was impossible.
      if (gate_type === "AND" || gate_type === "OR") {
        candidates.push({
          kind: "logical_gate_slot",
          gate_id: target,
          slot: "inputs",
          source_node: source,
        });
      } else if (gate_type === "NOT" && !existing_inputs.some((e) => e.source === source)) {
        candidates.push({
          kind: "logical_gate_slot",
          gate_id: target,
          slot: "input",
          source_node: source,
        });
      } else if (gate_type === "IF_THEN") {
        const has_antecedent = existing_inputs.some(
          (e) => (e as { slot?: string }).slot === "antecedent",
        );
        const has_consequent = existing_inputs.some(
          (e) => (e as { slot?: string }).slot === "consequent",
        );
        if (!has_antecedent) {
          candidates.push({
            kind: "logical_gate_slot",
            gate_id: target,
            slot: "antecedent",
            source_node: source,
          });
        }
        if (!has_consequent) {
          candidates.push({
            kind: "logical_gate_slot",
            gate_id: target,
            slot: "consequent",
            source_node: source,
          });
        }
      } else if (gate_type === "UNLESS") {
        const has_main = existing_inputs.some((e) => (e as { slot?: string }).slot === "main");
        const has_exception = existing_inputs.some(
          (e) => (e as { slot?: string }).slot === "exception",
        );
        if (!has_main) {
          candidates.push({
            kind: "logical_gate_slot",
            gate_id: target,
            slot: "main",
            source_node: source,
          });
        }
        if (!has_exception) {
          candidates.push({
            kind: "logical_gate_slot",
            gate_id: target,
            slot: "exception",
            source_node: source,
          });
        }
      }
    }
  }

  if (source_node.type === "Checkpoint" && "options" in source_node) {
    const checkpoint = source_node as { options?: Array<{ id: string; target_node_id?: string }> };
    for (const opt of checkpoint.options ?? []) {
      candidates.push({
        kind: "checkpoint_option_routing",
        checkpoint_id: source,
        option_id: opt.id,
        target,
      });
    }
  }

  return candidates;
}

const EDGE_TYPE_LABELS: Readonly<Record<EdgeType, string>> = {
  DECOMPOSES_INTO: "Decomposes into",
  TURNS_ON: "Turns on",
  INTERPRETED_AS: "Interpreted as",
  LEADS_TO: "Leads to",
  FORECLOSES: "Forecloses",
  GATES: "Gates",
  ANSWERS: "Answers",
  SUPPORTS: "Supports",
  CONTRADICTS: "Contradicts",
  CITES: "Cites",
  BINDING_IN: "Binding in",
  DISTINGUISHED_BY: "Distinguished by",
};

const GATE_SLOT_LABELS: Readonly<Record<LogicalGateSlot, string>> = {
  inputs: "Gate input",
  input: "Negation input",
  antecedent: "If antecedent",
  consequent: "Then consequent",
  main: "Main proposition",
  exception: "Exception",
};

export function candidateLabel(candidate: EdgeCreationCandidate): string {
  switch (candidate.kind) {
    case "edge":
      return EDGE_TYPE_LABELS[candidate.edge_type] ?? candidate.edge_type;
    case "logical_gate_slot":
      return GATE_SLOT_LABELS[candidate.slot] ?? candidate.slot;
    case "checkpoint_option_routing":
      return `Route checkpoint option here`;
  }
}
