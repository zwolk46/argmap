// Phase 3 of the compute pipeline (Stream C path tracing).
//
// computeReachableSet: every node visitable from the RootQuestion along the
// structural sub-graph, honoring foreclosure but ignoring whether a branch is
// currently selected. The set of "could-be-reached" given the frame.
//
// computeActiveSet: every node visitable from the RootQuestion that the
// session's selections / responses / gate evaluations actually route through.
// Nodes outside the active set get status `not_applicable` in phase 4.

import type { FrameVersion, ArgumentSession, NodeRef, Node, NodeStatus } from "@/schema";
import { sortedIter, sortedBy, sortedKeys } from "./iteration-helpers";
import {
  STRUCTURAL_EDGE_TYPES,
  type Graph,
  type TraversalEdge,
  type SyntheticEdge,
  findRoot,
  forwardReach,
  isSyntheticEdge,
} from "./graph";
import { gateRoutesTo } from "./gates";

type SessionLike = Pick<
  ArgumentSession,
  "interpretation_selections" | "checkpoint_responses" | "status_map"
>;

export function computeReachableSet(
  frame: FrameVersion,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
): ReadonlySet<NodeRef> {
  let root;
  try {
    root = findRoot(frame);
  } catch {
    return new Set<NodeRef>();
  }
  const reached = forwardReach(root.id, graph, foreclosed);
  const out = new Set<NodeRef>();
  for (const id of reached) out.add(id);
  return out;
}

function selectedInterpretationIdsFor(termId: NodeRef, session: SessionLike): ReadonlySet<NodeRef> {
  const out = new Set<NodeRef>();
  for (const sel of sortedBy(session.interpretation_selections, (s) => s.term_id)) {
    if (sel.term_id !== termId) continue;
    for (const iid of sortedBy(sel.selected_interpretation_ids, (x) => x)) {
      out.add(iid);
    }
  }
  return out;
}

function responseFor(
  checkpointId: NodeRef,
  session: SessionLike,
): { selected_option_id: string } | undefined {
  for (const r of sortedBy(session.checkpoint_responses, (x) => x.checkpoint_id)) {
    if (r.checkpoint_id === checkpointId) return r;
  }
  return undefined;
}

function statusMapAsMap(session: SessionLike): ReadonlyMap<NodeRef, NodeStatus> {
  const m = new Map<NodeRef, NodeStatus>();
  // session.status_map is a plain object; iterate via sorted keys.
  const sm = session.status_map as Record<string, NodeStatus> | undefined;
  if (!sm) return m;
  for (const k of sortedKeys(sm)) {
    const v = sm[k];
    if (v) m.set(k, v);
  }
  return m;
}

function branchIsFollowed(
  node: Node,
  edge: TraversalEdge,
  session: SessionLike,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): boolean {
  switch (node.type) {
    case "RootQuestion":
    case "SubQuestion":
      return STRUCTURAL_EDGE_TYPES.has(edge.type);
    case "Term": {
      if (edge.type !== "INTERPRETED_AS") return false;
      const selected = selectedInterpretationIdsFor(node.id, session);
      return selected.has(edge.target);
    }
    case "Interpretation":
      return edge.type === "LEADS_TO";
    case "Checkpoint": {
      if (edge.type !== "OPTION_LEADS_TO") return false;
      const r = responseFor(node.id, session);
      if (!r) return false;
      if (!isSyntheticEdge(edge)) return false;
      const se = edge as SyntheticEdge;
      return se.option_id === r.selected_option_id;
    }
    case "LogicalGate":
      if (edge.type !== "GATES") return false;
      return gateRoutesTo(node, status_map);
    default:
      // Premise / Authority / Conclusion: no outgoing structural edges followed.
      return false;
  }
}

export function computeActiveSet(
  frame: FrameVersion,
  session: SessionLike,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
): ReadonlySet<NodeRef> {
  let root;
  try {
    root = findRoot(frame);
  } catch {
    return new Set<NodeRef>();
  }
  const status_map = statusMapAsMap(session);
  const active = new Set<NodeRef>();
  const queue: NodeRef[] = [root.id];
  while (queue.length > 0) {
    const cur = queue.shift() as NodeRef;
    if (foreclosed.has(cur)) continue;
    if (active.has(cur)) continue;
    active.add(cur);
    const node = graph.nodeById(cur);
    for (const edge of graph.outTraversal(cur)) {
      if (!STRUCTURAL_EDGE_TYPES.has(edge.type)) continue;
      if (!branchIsFollowed(node, edge, session, status_map)) continue;
      if (foreclosed.has(edge.target)) continue;
      if (active.has(edge.target)) continue;
      queue.push(edge.target);
    }
  }
  // Sort the result for deterministic snapshot output downstream — the Set
  // itself is order-agnostic, but later consumers iterate via sortedIter.
  const out = new Set<NodeRef>();
  for (const id of sortedIter(active)) out.add(id);
  return out;
}
