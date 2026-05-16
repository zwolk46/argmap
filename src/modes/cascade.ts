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
    // F-15: without a RootQuestion to anchor reachability, compute the
    // cascade by treating any node still reachable from at least one of the
    // remaining nodes as "kept" — orphans (nothing points at them anymore)
    // are part of the cascade. Without this, a mid-construction frame that
    // deletes the only parent of a chain leaves orphan children behind, and
    // the user has to delete them one-by-one.
    const adj1 = buildAdj(frame);
    const adj2 = buildAdj(frame, target);

    // Roots-of-cascade-detection: every node that still has any inbound
    // structural edge (or is itself an entry-point with no inbound edges)
    // can anchor reachability when there's no RootQuestion.
    const targets_with_inbound = new Set<NodeRef>();
    for (const e of frame.edges) {
      if (e.target === target || e.source === target) continue;
      targets_with_inbound.add(e.target as NodeRef);
    }
    const all_node_ids = new Set<NodeRef>(frame.nodes.map((n) => n.id as NodeRef));
    const roots_for_cascade: NodeRef[] = [];
    for (const id of all_node_ids) {
      if (id === target) continue;
      if (!targets_with_inbound.has(id)) roots_for_cascade.push(id);
    }
    if (roots_for_cascade.length === 0) {
      // Pure island around the target — fall back to direct-edge removal.
      const deleted_edge_ids = frame.edges
        .filter((e) => e.source === target || e.target === target)
        .map((e) => e.id)
        .sort((a, b) => a.localeCompare(b));
      return { deleted_node_ids: [target], deleted_edge_ids };
    }
    const R1 = new Set<NodeRef>();
    for (const r of roots_for_cascade) for (const id of bfsReachable(r, adj1)) R1.add(id);
    R1.add(target);
    const R2 = new Set<NodeRef>();
    for (const r of roots_for_cascade) for (const id of bfsReachable(r, adj2)) R2.add(id);
    const cascade = new Set<NodeRef>([target]);
    for (const id of R1) {
      if (!R2.has(id)) cascade.add(id);
    }
    const deleted_node_ids = [...cascade].sort((a, b) => a.localeCompare(b));
    const deleted_edge_ids = frame.edges
      .filter((e) => cascade.has(e.source as NodeRef) || cascade.has(e.target as NodeRef))
      .map((e) => e.id)
      .sort((a, b) => a.localeCompare(b));
    return { deleted_node_ids, deleted_edge_ids };
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
