import type { FrameVersion, ArgumentSession, NodeRef, Node } from "@/schema";
import {
  isAndGate,
  isOrGate,
  isNotGate,
  isIfThenGate,
  isUnlessGate,
  isLogicalGate,
} from "@/schema";
import type { ComputeResult } from "@/runtime";
import type { NodeStatus } from "@/schema";

export interface InterviewItem {
  node_id: NodeRef;
  is_jurisdictional: boolean;
  reason: "open" | "indeterminate" | "contested" | "best_inference_pending";
  recommended_next: boolean;
  dfs_order: number;
  term_order: number;
}

export const INTERVIEW_SORT_KEYS = [
  "is_jurisdictional",
  "dfs_order",
  "term_order",
  "node_id",
] as const;

const STRUCTURAL_EDGE_TYPES_INTERVIEW = new Set([
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
]);

function buildStructuralAdj(frame: FrameVersion): Map<NodeRef, NodeRef[]> {
  const adj = new Map<NodeRef, NodeRef[]>();
  for (const n of frame.nodes) adj.set(n.id, []);
  for (const e of frame.edges) {
    if (!STRUCTURAL_EDGE_TYPES_INTERVIEW.has(e.type)) continue;
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }
  return adj;
}

function buildParentMap(frame: FrameVersion): Map<NodeRef, NodeRef> {
  const parent = new Map<NodeRef, NodeRef>();
  for (const e of frame.edges) {
    if (e.type === "DECOMPOSES_INTO") {
      parent.set(e.target, e.source);
    }
  }
  return parent;
}

export function computeInterviewOrder(
  frame: FrameVersion,
  session: ArgumentSession,
  compute_result: ComputeResult,
): InterviewItem[] {
  const reachable = compute_result.reachable_set;
  const status_map = compute_result.status_map;

  const nodes_by_id = new Map<NodeRef, Node>(frame.nodes.map((n) => [n.id, n]));
  const adj = buildStructuralAdj(frame);
  const parent_map = buildParentMap(frame);

  const dfs_order_by_id = new Map<NodeRef, number>();
  const visited = new Set<NodeRef>();
  let cursor = 0;
  const root = frame.nodes.find((n) => n.type === "RootQuestion");
  if (root) {
    dfsPreorderFromRoot(root.id, nodes_by_id, adj, session, visited, (id) => {
      dfs_order_by_id.set(id, cursor++);
    });
  }

  const items: InterviewItem[] = [];
  for (const [id, dfs_order] of dfs_order_by_id) {
    if (!reachable.has(id)) continue;
    const node = nodes_by_id.get(id)!;
    const item_seed = openItemFor(node, session, status_map);
    if (item_seed === null) continue;
    items.push({
      node_id: id,
      is_jurisdictional: isJurisdictionalAt(node, nodes_by_id, parent_map),
      reason: item_seed.reason,
      recommended_next: false,
      dfs_order,
      term_order: termOrderOf(node),
    });
  }

  items.sort(
    (a, b) =>
      Number(b.is_jurisdictional) - Number(a.is_jurisdictional) ||
      a.dfs_order - b.dfs_order ||
      a.term_order - b.term_order ||
      a.node_id.localeCompare(b.node_id),
  );

  const first_non_advisory = items.findIndex((it) => it.reason !== "best_inference_pending");
  if (first_non_advisory >= 0) items[first_non_advisory]!.recommended_next = true;
  else if (items.length > 0) items[0]!.recommended_next = true;

  return items;
}

export function dfsPreorderFromRoot(
  start_id: NodeRef,
  nodes_by_id: Map<NodeRef, Node>,
  adj: Map<NodeRef, NodeRef[]>,
  session: ArgumentSession,
  visited: Set<NodeRef>,
  visit: (id: NodeRef) => void,
): void {
  if (visited.has(start_id)) return;
  visited.add(start_id);
  visit(start_id);

  const node = nodes_by_id.get(start_id);
  if (!node) return;

  const child_ids = orderedChildIdsOf(node, nodes_by_id, adj, session);
  for (const child_id of child_ids) {
    dfsPreorderFromRoot(child_id, nodes_by_id, adj, session, visited, visit);
  }
}

export function openItemFor(
  node: Node,
  session: ArgumentSession,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): { reason: InterviewItem["reason"] } | null {
  if (
    node.type === "Conclusion" ||
    node.type === "Authority" ||
    node.type === "Premise" ||
    node.type === "LogicalGate"
  ) {
    return null;
  }

  if (node.type === "Term") {
    // Linked Terms are skipped when their target has a non-empty selection
    if (node.linked_to) {
      const linked_sel = session.interpretation_selections.find(
        (s) => s.term_id === node.linked_to,
      );
      if (linked_sel && linked_sel.selected_interpretation_ids.length > 0) return null;
    }
    const sel = session.interpretation_selections.find((s) => s.term_id === node.id);
    if (!sel || sel.selected_interpretation_ids.length === 0) {
      return { reason: "open" };
    }
    return null;
  }

  if (node.type === "Checkpoint") {
    const response = session.checkpoint_responses.find((r) => r.checkpoint_id === node.id);
    if (!response) return { reason: "open" };
    // V-ARG-2: check if premise has required authority_ref
    if (node.requires_authority) {
      const premise = session.premises.find((p) => p.id === response.premise_id);
      if (premise && !premise.authority_ref) {
        return { reason: "indeterminate" };
      }
    }
    return null;
  }

  if (node.type === "Interpretation") {
    const options_box = node.options_box;
    if (options_box && (options_box as { authority_required?: boolean }).authority_required) {
      const has_support = session.session_authorities?.some((a) => a.id === node.id) ?? false;
      if (!has_support) return { reason: "best_inference_pending" };
    }
    return null;
  }

  if (node.type === "SubQuestion" || node.type === "RootQuestion") {
    const status = status_map.get(node.id);
    if (!status) return null;
    if (status.status === "open") return { reason: "indeterminate" };
    if (status.status === "contested") return { reason: "contested" };
    return null;
  }

  return null;
}

function orderedChildIdsOf(
  node: Node,
  nodes_by_id: Map<NodeRef, Node>,
  adj: Map<NodeRef, NodeRef[]>,
  session: ArgumentSession,
): NodeRef[] {
  if (node.type === "RootQuestion" || node.type === "SubQuestion") {
    const targets = adj.get(node.id) ?? [];
    const subqs: [boolean, NodeRef][] = [];
    const terms: [number, NodeRef][] = [];
    const others: NodeRef[] = [];
    for (const id of targets) {
      const child = nodes_by_id.get(id);
      if (!child) continue;
      if (child.type === "SubQuestion") {
        subqs.push([child.is_jurisdictional, id]);
      } else if (child.type === "Term") {
        terms.push([child.order, id]);
      } else {
        others.push(id);
      }
    }
    subqs.sort((a, b) => Number(b[0]) - Number(a[0]) || a[1].localeCompare(b[1]));
    terms.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
    others.sort((a, b) => a.localeCompare(b));
    return [...subqs.map((x) => x[1]), ...terms.map((x) => x[1]), ...others];
  }

  if (node.type === "Term") {
    const sel = session.interpretation_selections.find((s) => s.term_id === node.id);
    if (!sel || sel.selected_interpretation_ids.length === 0) return [];
    const selected = new Set(sel.selected_interpretation_ids);
    const targets = adj.get(node.id) ?? [];
    return targets.filter((id) => selected.has(id)).sort((a, b) => a.localeCompare(b));
  }

  if (node.type === "Checkpoint") {
    const response = session.checkpoint_responses.find((r) => r.checkpoint_id === node.id);
    if (!response) return [];
    const chosen_option = node.options.find((o) => o.id === response.selected_option_id);
    if (!chosen_option?.target_node_id) return [];
    return [chosen_option.target_node_id];
  }

  if (node.type === "Interpretation") {
    const targets = adj.get(node.id) ?? [];
    return [...targets].sort((a, b) => a.localeCompare(b));
  }

  if (node.type === "LogicalGate" && isLogicalGate(node)) {
    if (isAndGate(node) || isOrGate(node)) return [...node.inputs];
    if (isNotGate(node)) return [node.input];
    if (isIfThenGate(node)) return [node.antecedent, node.consequent];
    if (isUnlessGate(node)) return [node.main, node.exception];
  }

  return [];
}

function isJurisdictionalAt(
  node: Node,
  nodes_by_id: Map<NodeRef, Node>,
  parent_map: Map<NodeRef, NodeRef>,
): boolean {
  let current: Node | undefined = node;
  while (current) {
    if (current.type === "SubQuestion" && current.is_jurisdictional) return true;
    if (current.type === "RootQuestion") return false;
    const parent_id = parent_map.get(current.id);
    if (!parent_id) return false;
    current = nodes_by_id.get(parent_id);
  }
  return false;
}

function termOrderOf(node: Node): number {
  return node.type === "Term" ? (node.order ?? 0) : 0;
}
