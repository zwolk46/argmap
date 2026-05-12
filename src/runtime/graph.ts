// Phase-zero structural projection of a FrameVersion. Pure.
//
// Reifies the FrameVersion into an in-memory Graph that downstream phases walk.
// Synthesizes edges from CheckpointOption.target_node_id (OPTION_LEADS_TO) and
// LogicalGate.output_target (GATES) so traversal code does not have to special-
// case those routing patterns at every call site.

import type {
  FrameVersion,
  Node,
  Edge,
  EdgeType,
  NodeRef,
  RootQuestion,
  Checkpoint,
  LogicalGate,
} from "@/schema";
import { isCheckpoint, isLogicalGate } from "@/schema";
import { sortedBy, sortedIter } from "./iteration-helpers";

export type TraversalEdgeType = EdgeType | "OPTION_LEADS_TO";

export const STRUCTURAL_EDGE_TYPES: ReadonlySet<TraversalEdgeType> = new Set<TraversalEdgeType>([
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
  "OPTION_LEADS_TO",
]);

export interface SyntheticEdge {
  readonly synthetic: true;
  readonly type: "OPTION_LEADS_TO" | "GATES";
  readonly source: NodeRef;
  readonly target: NodeRef;
  /** Present only when type === "OPTION_LEADS_TO". */
  readonly option_id?: string;
}

export type TraversalEdge = Edge | SyntheticEdge;

export function isSyntheticEdge(e: TraversalEdge): e is SyntheticEdge {
  return (e as SyntheticEdge).synthetic === true;
}

export interface Graph {
  readonly nodeById: (id: NodeRef) => Node;
  readonly allNodeIds: ReadonlyArray<NodeRef>;
  readonly allEdges: ReadonlyArray<Edge>;
  readonly outTraversal: (nodeId: NodeRef) => ReadonlyArray<TraversalEdge>;
  readonly incoming: (nodeId: NodeRef) => ReadonlyArray<Edge>;
}

export class RuntimeStructuralError extends Error {
  constructor(
    public readonly kind: "no_root" | "multiple_roots" | "cycle" | "missing_node",
    public readonly node_ids: ReadonlyArray<NodeRef>,
    message: string,
  ) {
    super(message);
    this.name = "RuntimeStructuralError";
  }
}

function buildSyntheticForCheckpoint(node: Checkpoint): SyntheticEdge[] {
  const out: SyntheticEdge[] = [];
  for (const opt of sortedBy(node.options, (o) => o.id)) {
    if (opt.target_node_id) {
      out.push({
        synthetic: true,
        type: "OPTION_LEADS_TO",
        source: node.id,
        target: opt.target_node_id,
        option_id: opt.id,
      });
    }
  }
  return out;
}

function gateOutputTarget(gate: LogicalGate): NodeRef | undefined {
  return gate.output_target;
}

function buildSyntheticForGate(
  gate: LogicalGate,
  persistedGatesOut: ReadonlySet<NodeRef>,
): SyntheticEdge[] {
  const target = gateOutputTarget(gate);
  if (!target) return [];
  if (persistedGatesOut.has(target)) return [];
  return [
    {
      synthetic: true,
      type: "GATES",
      source: gate.id,
      target,
    },
  ];
}

export function buildGraph(frame: FrameVersion): Graph {
  // Index nodes by id. Lex-sorted by id for deterministic allNodeIds.
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  const allNodeIds: NodeRef[] = sortedBy(frame.nodes, (n) => n.id).map((n) => n.id);

  // Pre-sorted persisted edges, by edge id.
  const allEdges: ReadonlyArray<Edge> = sortedBy(frame.edges, (e) => e.id);

  // Out/in adjacency, deterministic.
  const outBySource = new Map<NodeRef, TraversalEdge[]>();
  const inByTarget = new Map<NodeRef, Edge[]>();

  // Index persisted GATES edges per source (for de-duplication with
  // synthesized gate.output_target edges).
  const persistedGatesTargetsBySource = new Map<NodeRef, Set<NodeRef>>();

  for (const e of allEdges) {
    let outArr = outBySource.get(e.source);
    if (!outArr) {
      outArr = [];
      outBySource.set(e.source, outArr);
    }
    outArr.push(e);
    let inArr = inByTarget.get(e.target);
    if (!inArr) {
      inArr = [];
      inByTarget.set(e.target, inArr);
    }
    inArr.push(e);
    if (e.type === "GATES") {
      let s = persistedGatesTargetsBySource.get(e.source);
      if (!s) {
        s = new Set<NodeRef>();
        persistedGatesTargetsBySource.set(e.source, s);
      }
      s.add(e.target);
    }
  }

  // Synthetic edges: CheckpointOption.target_node_id and LogicalGate.output_target.
  // Walk nodes in lex-sorted id order.
  for (const n of sortedBy(frame.nodes, (x) => x.id)) {
    if (isCheckpoint(n)) {
      const synthetic = buildSyntheticForCheckpoint(n);
      if (synthetic.length === 0) continue;
      let outArr = outBySource.get(n.id);
      if (!outArr) {
        outArr = [];
        outBySource.set(n.id, outArr);
      }
      outArr.push(...synthetic);
    } else if (isLogicalGate(n)) {
      const persisted = persistedGatesTargetsBySource.get(n.id) ?? new Set<NodeRef>();
      const synthetic = buildSyntheticForGate(n, persisted);
      if (synthetic.length === 0) continue;
      let outArr = outBySource.get(n.id);
      if (!outArr) {
        outArr = [];
        outBySource.set(n.id, outArr);
      }
      outArr.push(...synthetic);
    }
  }

  // Finalize out adjacency ordering: persisted edges sorted by edge.id first
  // (they already are, since we walked allEdges in sorted order), then
  // synthetic edges sorted by (type, target).
  const finalizedOut = new Map<NodeRef, ReadonlyArray<TraversalEdge>>();
  for (const nid of allNodeIds) {
    const arr = outBySource.get(nid) ?? [];
    const persisted: Edge[] = [];
    const synthetic: SyntheticEdge[] = [];
    for (const e of arr) {
      if (isSyntheticEdge(e)) synthetic.push(e);
      else persisted.push(e);
    }
    // persisted is already in edge-id order (we appended in sorted edge walk).
    persisted.sort((a, b) => a.id.localeCompare(b.id));
    synthetic.sort((a, b) => {
      const t = a.type.localeCompare(b.type);
      if (t !== 0) return t;
      return a.target.localeCompare(b.target);
    });
    finalizedOut.set(nid, [...persisted, ...synthetic]);
  }

  // Incoming: only persisted; sort by edge.id.
  const finalizedIn = new Map<NodeRef, ReadonlyArray<Edge>>();
  for (const nid of allNodeIds) {
    const arr = inByTarget.get(nid) ?? [];
    finalizedIn.set(
      nid,
      sortedBy(arr, (e) => e.id),
    );
  }

  return {
    nodeById(id: NodeRef): Node {
      const n = nodeMap.get(id);
      if (!n) {
        throw new RuntimeStructuralError("missing_node", [id], `No node with id '${id}'.`);
      }
      return n;
    },
    allNodeIds,
    allEdges,
    outTraversal(nodeId: NodeRef): ReadonlyArray<TraversalEdge> {
      return finalizedOut.get(nodeId) ?? [];
    },
    incoming(nodeId: NodeRef): ReadonlyArray<Edge> {
      return finalizedIn.get(nodeId) ?? [];
    },
  };
}

export function findRoot(frame: FrameVersion): RootQuestion {
  const roots = sortedBy(frame.nodes, (n) => n.id).filter(
    (n): n is RootQuestion => n.type === "RootQuestion",
  );
  if (roots.length === 1) return roots[0];
  if (roots.length === 0) {
    throw new RuntimeStructuralError("no_root", [], "Frame has no RootQuestion.");
  }
  throw new RuntimeStructuralError(
    "multiple_roots",
    roots.map((r) => r.id),
    `Frame has multiple RootQuestions: ${roots.map((r) => r.id).join(", ")}.`,
  );
}

export function forwardReach(
  start: NodeRef,
  graph: Graph,
  blocked?: ReadonlySet<NodeRef>,
): ReadonlyArray<NodeRef> {
  const visited = new Set<NodeRef>();
  const queue: NodeRef[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift() as NodeRef;
    if (visited.has(cur)) continue;
    if (blocked && blocked.has(cur)) continue;
    visited.add(cur);
    for (const edge of graph.outTraversal(cur)) {
      if (!STRUCTURAL_EDGE_TYPES.has(edge.type)) continue;
      const t = edge.target;
      if (visited.has(t)) continue;
      if (blocked && blocked.has(t)) continue;
      queue.push(t);
    }
  }
  return sortedIter(visited);
}

export function topologicalSort(graph: Graph): ReadonlyArray<NodeRef> {
  // Kahn's algorithm over the structural sub-graph; lex-sorted ties.
  const inDeg = new Map<NodeRef, number>();
  for (const nid of graph.allNodeIds) inDeg.set(nid, 0);
  for (const nid of graph.allNodeIds) {
    for (const edge of graph.outTraversal(nid)) {
      if (!STRUCTURAL_EDGE_TYPES.has(edge.type)) continue;
      const t = edge.target;
      inDeg.set(t, (inDeg.get(t) ?? 0) + 1);
    }
  }

  // Initial frontier: all nodes with in-degree 0, sorted lex.
  const frontier: NodeRef[] = [];
  for (const nid of graph.allNodeIds) {
    if ((inDeg.get(nid) ?? 0) === 0) frontier.push(nid);
  }
  frontier.sort((a, b) => a.localeCompare(b));

  const order: NodeRef[] = [];
  while (frontier.length > 0) {
    const cur = frontier.shift() as NodeRef;
    order.push(cur);
    // Decrement in-degree of structural-edge targets in deterministic order.
    const successors: NodeRef[] = [];
    for (const edge of graph.outTraversal(cur)) {
      if (!STRUCTURAL_EDGE_TYPES.has(edge.type)) continue;
      successors.push(edge.target);
    }
    successors.sort((a, b) => a.localeCompare(b));
    for (const t of successors) {
      const d = (inDeg.get(t) ?? 0) - 1;
      inDeg.set(t, d);
      if (d === 0) {
        // Insert lex-sorted into the frontier.
        let inserted = false;
        for (let i = 0; i < frontier.length; i++) {
          if (t.localeCompare(frontier[i]) < 0) {
            frontier.splice(i, 0, t);
            inserted = true;
            break;
          }
        }
        if (!inserted) frontier.push(t);
      }
    }
  }

  if (order.length !== graph.allNodeIds.length) {
    const remaining: NodeRef[] = [];
    for (const nid of graph.allNodeIds) {
      if (!order.includes(nid)) remaining.push(nid);
    }
    throw new RuntimeStructuralError(
      "cycle",
      remaining,
      `Structural sub-graph contains a cycle through nodes: ${remaining.join(", ")}.`,
    );
  }

  return order;
}
