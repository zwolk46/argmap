import type { FrameVersion, NodeRef, EdgeRef } from "@/schema";
import { isAndGate, isOrGate, isNotGate, isIfThenGate, isUnlessGate } from "@/schema";

export interface CascadeReport {
  deleted_node_ids: NodeRef[];
  deleted_edge_ids: EdgeRef[];
}

const STRUCTURAL_EDGE_TYPES = new Set([
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
]);

function buildAdj(frame: FrameVersion, exclude?: NodeRef): Map<NodeRef, NodeRef[]> {
  const adj = new Map<NodeRef, NodeRef[]>();

  for (const n of frame.nodes) {
    if (n.id !== exclude) adj.set(n.id, []);
  }

  for (const e of frame.edges) {
    if (e.source === exclude || e.target === exclude) continue;
    if (!STRUCTURAL_EDGE_TYPES.has(e.type)) continue;
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  for (const n of frame.nodes) {
    if (n.id === exclude) continue;
    if (n.type === "LogicalGate") {
      const list = adj.get(n.id);
      if (!list) continue;
      if (isAndGate(n) || isOrGate(n)) {
        for (const id of n.inputs) if (id !== exclude) list.push(id);
      } else if (isNotGate(n)) {
        if (n.input !== exclude) list.push(n.input);
      } else if (isIfThenGate(n)) {
        if (n.antecedent !== exclude) list.push(n.antecedent);
        if (n.consequent !== exclude) list.push(n.consequent);
      } else if (isUnlessGate(n)) {
        if (n.main !== exclude) list.push(n.main);
        if (n.exception !== exclude) list.push(n.exception);
      }
    }
    if (n.type === "Checkpoint") {
      const list = adj.get(n.id);
      if (!list) continue;
      for (const opt of n.options) {
        if (opt.target_node_id && opt.target_node_id !== exclude) {
          list.push(opt.target_node_id);
        }
      }
    }
  }

  return adj;
}

function bfsReachable(start: NodeRef, adj: Map<NodeRef, NodeRef[]>): Set<NodeRef> {
  const visited = new Set<NodeRef>();
  const queue: NodeRef[] = [start];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const neighbor of adj.get(curr) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited;
}

export function computeDeletionCascade(frame: FrameVersion, target: NodeRef): CascadeReport {
  const root = frame.nodes.find((n) => n.type === "RootQuestion");

  if (!root) {
    const deleted_edge_ids = frame.edges
      .filter((e) => e.source === target || e.target === target)
      .map((e) => e.id)
      .sort((a, b) => a.localeCompare(b));
    return {
      deleted_node_ids: [target],
      deleted_edge_ids,
    };
  }

  const adj1 = buildAdj(frame);
  const R1 = bfsReachable(root.id, adj1);

  const adj2 = buildAdj(frame, target);
  const R2 = bfsReachable(root.id, adj2);

  const cascade = new Set<NodeRef>([target]);
  for (const id of R1) {
    if (!R2.has(id)) cascade.add(id);
  }

  const deleted_node_ids = [...cascade].sort((a, b) => a.localeCompare(b));
  const deleted_edge_ids = frame.edges
    .filter((e) => cascade.has(e.source) || cascade.has(e.target))
    .map((e) => e.id)
    .sort((a, b) => a.localeCompare(b));

  return { deleted_node_ids, deleted_edge_ids };
}

export function previewNodeDeletion(frame: FrameVersion, target: NodeRef): CascadeReport {
  return computeDeletionCascade(frame, target);
}
