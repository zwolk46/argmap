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

      if (gate_type === "AndGate" || gate_type === "OrGate") {
        candidates.push({
          kind: "logical_gate_slot",
          gate_id: target,
          slot: "inputs",
          source_node: source,
        });
      } else if (gate_type === "NotGate" && !existing_inputs.some((e) => e.source === source)) {
        candidates.push({
          kind: "logical_gate_slot",
          gate_id: target,
          slot: "input",
          source_node: source,
        });
      } else if (gate_type === "IfThenGate") {
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
      } else if (gate_type === "UnlessGate") {
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

export function candidateLabel(candidate: EdgeCreationCandidate): string {
  switch (candidate.kind) {
    case "edge":
      return candidate.edge_type.replace(/_/g, " ").toLowerCase();
    case "logical_gate_slot":
      return `Gate input: ${candidate.slot}`;
    case "checkpoint_option_routing":
      return `Route option ${candidate.option_id} → here`;
  }
}
