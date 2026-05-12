import type { FrameVersion, Node, Edge, EdgeType, NodeRef } from "@/schema";
import { dimensionsFor } from "./dimensions";
import { ELK_LAYERED_OPTIONS, elkDirectionOptions } from "./elk-options";
import { resolveLayoutOptions, type LayoutOptions, type LayoutResult } from "./types";

// Edge types that propagate visibility in the collapse BFS.
const BFS_TRAVERSAL_EDGES: ReadonlySet<EdgeType> = new Set([
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
  "FORECLOSES",
]);

// Edge types passed to ELK for layout routing. Superset of BFS_TRAVERSAL_EDGES
// plus annotation edges that connect frame-layer nodes. Argument-layer edges
// (SUPPORTS, CONTRADICTS, ANSWERS) live on ArgumentSessionVersion, not here.
const LAID_OUT_EDGE_TYPES: ReadonlySet<EdgeType> = new Set([
  ...BFS_TRAVERSAL_EDGES,
  "CITES",
  "BINDING_IN",
  "DISTINGUISHED_BY",
]);

export interface ElkGraph {
  id: string;
  children: ElkNode[];
  edges: ElkEdge[];
  layoutOptions: Record<string, string>;
}

export interface ElkNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  layoutOptions?: Record<string, string>;
}

export interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export interface ElkResult {
  id: string;
  width: number;
  height: number;
  children: { id: string; x: number; y: number; width: number; height: number }[];
}

export function frameToElkGraph(
  frame: FrameVersion,
  opts?: Partial<LayoutOptions>,
  warnings?: string[],
): ElkGraph {
  const resolved = resolveLayoutOptions(opts);

  const sortedNodes = [...frame.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...frame.edges].sort((a, b) => a.id.localeCompare(b.id));

  const visible = computeVisibleNodes(sortedNodes, sortedEdges, resolved.collapse_subquestions);

  const visibleEdges = sortedEdges.filter(
    (e) => visible.has(e.source) && visible.has(e.target) && LAID_OUT_EDGE_TYPES.has(e.type),
  );

  const elkNodes: ElkNode[] = [];
  for (const n of sortedNodes) {
    if (!visible.has(n.id)) continue;
    // Premise nodes should not be in frame.nodes but guard defensively.
    if (n.type === "Premise") {
      pushWarning(
        warnings,
        `frameToElkGraph: skipping node with unhandled type "${n.type}" (id=${n.id})`,
      );
      continue;
    }
    // After the Premise guard, n.type is Exclude<NodeType, "Premise">.
    const dim = dimensionsFor(n.type);
    const elkNode: ElkNode = { id: n.id, width: dim.width, height: dim.height };
    // F-011 resolution: anchors live on node.presentation?.x / y (not flat).
    const px = n.presentation?.x;
    const py = n.presentation?.y;
    if (resolved.honor_user_anchors && typeof px === "number" && typeof py === "number") {
      elkNode.x = px;
      elkNode.y = py;
      elkNode.layoutOptions = {
        "elk.position": `(${px},${py})`,
        "elk.layered.fixed": "true",
      };
    }
    elkNodes.push(elkNode);
  }

  const elkEdges: ElkEdge[] = visibleEdges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  return {
    id: "root",
    children: elkNodes,
    edges: elkEdges,
    layoutOptions: { ...ELK_LAYERED_OPTIONS, ...elkDirectionOptions(resolved.direction) },
  };
}

function computeVisibleNodes(
  sortedNodes: Node[],
  sortedEdges: Edge[],
  collapse: boolean,
): Set<NodeRef> {
  const all = new Set<NodeRef>(sortedNodes.map((n) => n.id));
  if (!collapse) return all;

  const reachableViaStructure = new Set<NodeRef>();
  const root = sortedNodes.find((n) => n.type === "RootQuestion");

  if (root) {
    const queue: NodeRef[] = [root.id];
    reachableViaStructure.add(root.id);
    const nodeById = new Map<NodeRef, Node>(sortedNodes.map((n) => [n.id, n]));
    const outgoingByNode = new Map<NodeRef, Edge[]>();
    for (const e of sortedEdges) {
      if (!BFS_TRAVERSAL_EDGES.has(e.type)) continue;
      const list = outgoingByNode.get(e.source) ?? [];
      list.push(e);
      outgoingByNode.set(e.source, list);
    }
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curNode = nodeById.get(cur);
      // F-011 resolution: collapsed lives on presentation?.collapsed (not flat).
      if (curNode?.type === "SubQuestion" && curNode.presentation?.collapsed) {
        continue;
      }
      const outs = outgoingByNode.get(cur) ?? [];
      for (const e of outs) {
        if (!reachableViaStructure.has(e.target)) {
          reachableViaStructure.add(e.target);
          queue.push(e.target);
        }
      }
    }
  }

  const visible = new Set<NodeRef>(reachableViaStructure);
  for (const n of sortedNodes) {
    if (n.type === "Authority" || n.type === "Premise") visible.add(n.id);
  }
  return visible;
}

function pushWarning(sink: string[] | undefined, message: string): void {
  if (sink) sink.push(message);
  else if (typeof console !== "undefined") console.warn(message);
}

export function elkResultToLayoutResult(elk_result: ElkResult, computed_at: string): LayoutResult {
  const positions = elk_result.children
    .map((c) => ({ node_id: c.id, x: c.x, y: c.y }))
    .sort((a, b) => a.node_id.localeCompare(b.node_id));
  return {
    positions,
    width: elk_result.width,
    height: elk_result.height,
    computed_at,
  };
}
