// Public runtime helpers consumed by downstream modules per contracts v2.
//
// computeCascadeReport (F-004): cascade-delete report for the modes layer's
// node_removed dispatch entry.
//
// enumerateOrphanCandidates (F-007): pre-migration analysis used by the
// session-migration UI to enumerate carriers (premises, edges, answers,
// selections, authorities) that would not have a target node in the
// destination FrameVersion.
//
// rankPremiseReuse: deterministic Jaccard + recency + kind-match ranking.

import type {
  FrameVersion,
  ArgumentSessionVersion,
  NodeRef,
  NodeType,
  EdgeRef,
  Premise,
  Node,
} from "@/schema";
import { sortedBy } from "./iteration-helpers";

// ---- Reattach heuristic (P0-25) -------------------------------------------
// The "Reattach" branch of session migration was unreachable before this:
// the UI offered the option but enumerateOrphanCandidates never populated
// `reattach_candidates`, and the runtime never set `suggested_kind: "reattach"`.
// The heuristic below mirrors what the (previously dead) modes-side variant
// did: walk inbound parent edges in both the prior snapshot and the target
// frame, then offer target nodes of the same type whose parent matches the
// orphan's prior parent.

const PARENT_EDGE_TYPES_FOR_REATTACH = new Set(["DECOMPOSES_INTO", "INTERPRETED_AS", "TURNS_ON"]);

function buildInboundParentMap(fv: FrameVersion): Map<NodeRef, NodeRef> {
  const parent = new Map<NodeRef, NodeRef>();
  for (const e of fv.edges) {
    if (PARENT_EDGE_TYPES_FOR_REATTACH.has(e.type)) {
      parent.set(e.target, e.source);
    }
  }
  return parent;
}

function nodePreview(n: Node): string {
  switch (n.type) {
    case "RootQuestion":
    case "SubQuestion":
    case "Interpretation":
    case "Conclusion":
    case "Premise":
      return truncate(n.statement, 60);
    case "Term":
      return truncate(n.name, 60);
    case "Checkpoint":
      return truncate(n.question, 60);
    case "Authority":
      return truncate(n.citation, 60);
    case "LogicalGate":
      return `${n.gate_type} gate`;
  }
}

/**
 * Find target-frame nodes of `required_type` that share a parent with the
 * orphan in the prior snapshot. Returns at most a handful of candidates,
 * sorted lex by id for determinism.
 */
function findReattachCandidates(
  orphan_node_id: NodeRef,
  required_type: NodeType,
  prior_frame: FrameVersion,
  target_frame: FrameVersion,
): ReadonlyArray<{ target_node_id: NodeRef; label: string }> {
  const prior_parents = buildInboundParentMap(prior_frame);
  const target_parents = buildInboundParentMap(target_frame);
  const orphan_parent = prior_parents.get(orphan_node_id);
  // If we can't anchor on a parent, fall back to all same-type nodes in
  // target — the user still sees options instead of an empty list, just
  // less narrow. Better than the previous behavior (nothing).
  const same_type = target_frame.nodes.filter((n) => n.type === required_type);
  const matches = orphan_parent
    ? same_type.filter((n) => target_parents.get(n.id) === orphan_parent)
    : same_type;
  return sortedBy(matches, (n) => n.id).map((n) => ({
    target_node_id: n.id,
    label: nodePreview(n),
  }));
}

export type CascadeReason =
  | { kind: "orphaned_by_node"; cause_node_id: NodeRef }
  | { kind: "orphaned_by_edge"; cause_edge_id: EdgeRef }
  | { kind: "explicitly_requested" };

export interface CascadeReport {
  cascade_nodes: ReadonlyArray<{ node_id: NodeRef; reason: CascadeReason }>;
  cascade_edges: ReadonlyArray<{ edge_id: EdgeRef; reason: CascadeReason }>;
}

export interface OrphanCandidate {
  carrier_kind:
    | "premise"
    | "argument_edge"
    | "checkpoint_answer"
    | "interpretation_selection"
    | "session_authority";
  carrier_id: string;
  /**
   * The key the repository's resolution map looks up when rewriting this
   * carrier. For premises / session authorities, this is the carrier_id
   * (the premise or authority id). For checkpoint answers and interpretation
   * selections, this is the checkpoint_id / term_id (which is also a node
   * id in the target frame's space). For argument_edges, this is the
   * missing source-or-target node id — the one that caused the orphan.
   *
   * Required so the UI's `OrphanResolution.source_node_id` can be populated
   * correctly (P0-6). Before threading this through, every migration
   * silently no-op'd because the repository's resolution_map stayed empty.
   */
  source_node_id: NodeRef;
  display_summary: string;
  suggested_kind: "discard" | "reattach" | "no_op";
  reattach_candidates?: ReadonlyArray<{ target_node_id: NodeRef; label: string }>;
}

export interface PremiseReuseSuggestion {
  premise_id: string;
  score: number;
}

export function computeCascadeReport(
  frame_version: FrameVersion,
  to_delete: { node_ids?: NodeRef[]; edge_ids?: EdgeRef[] },
): CascadeReport {
  const removedNodes = new Set<NodeRef>(to_delete.node_ids ?? []);
  const removedEdges = new Set<EdgeRef>(to_delete.edge_ids ?? []);

  const cascade_nodes: Array<{ node_id: NodeRef; reason: CascadeReason }> = [];
  const cascade_edges: Array<{ edge_id: EdgeRef; reason: CascadeReason }> = [];

  // Explicitly requested first (sorted lex).
  for (const id of sortedBy([...removedNodes], (x) => x)) {
    cascade_nodes.push({ node_id: id, reason: { kind: "explicitly_requested" } });
  }
  for (const id of sortedBy([...removedEdges], (x) => x)) {
    cascade_edges.push({ edge_id: id, reason: { kind: "explicitly_requested" } });
  }

  // Edges whose source or target is in removedNodes → cascade.
  for (const e of sortedBy(frame_version.edges, (x) => x.id)) {
    if (removedEdges.has(e.id)) continue;
    if (removedNodes.has(e.source)) {
      cascade_edges.push({
        edge_id: e.id,
        reason: { kind: "orphaned_by_node", cause_node_id: e.source },
      });
    } else if (removedNodes.has(e.target)) {
      cascade_edges.push({
        edge_id: e.id,
        reason: { kind: "orphaned_by_node", cause_node_id: e.target },
      });
    }
  }

  return { cascade_nodes, cascade_edges };
}

/**
 * Enumerate orphan carriers in `session_version` against `target_frame_version`.
 *
 * `prior_frame_version` (optional, recommended) is the frame snapshot the
 * session was authored against. When supplied, P0-25's reattach heuristic
 * runs: for each orphaned carrier, look up the orphan's parent in the
 * prior snapshot and find same-type nodes in the target with the same
 * parent. If any are found, the candidate's `suggested_kind` flips to
 * "reattach" and `reattach_candidates` is populated. Without the prior
 * frame all carriers default to "discard" (the previous behavior).
 */
export function enumerateOrphanCandidates(
  session_version: ArgumentSessionVersion,
  target_frame_version: FrameVersion,
  prior_frame_version?: FrameVersion,
): OrphanCandidate[] {
  const nodeIds = new Set<NodeRef>();
  for (const n of target_frame_version.nodes) nodeIds.add(n.id);
  const prior_nodes_by_id = new Map<NodeRef, Node>(
    (prior_frame_version?.nodes ?? []).map((n) => [n.id, n]),
  );

  function suggestReattach(
    orphan_node_id: NodeRef,
    required_type: NodeType,
  ): {
    reattach_candidates?: ReadonlyArray<{ target_node_id: NodeRef; label: string }>;
    suggested_kind: "reattach" | "discard";
  } {
    if (!prior_frame_version) return { suggested_kind: "discard" };
    const candidates = findReattachCandidates(
      orphan_node_id,
      required_type,
      prior_frame_version,
      target_frame_version,
    );
    if (candidates.length === 0) return { suggested_kind: "discard" };
    return { suggested_kind: "reattach", reattach_candidates: candidates };
  }

  const out: OrphanCandidate[] = [];

  for (const p of sortedBy(session_version.premises, (x) => x.id)) {
    if (p.authority_ref && !nodeIds.has(p.authority_ref)) {
      const suggestion = suggestReattach(p.authority_ref, "Authority");
      out.push({
        carrier_kind: "premise",
        carrier_id: p.id,
        source_node_id: p.id,
        display_summary: `Premise '${truncate(p.statement, 60)}' cites missing authority ${p.authority_ref}.`,
        suggested_kind: suggestion.suggested_kind,
        ...(suggestion.reattach_candidates
          ? { reattach_candidates: suggestion.reattach_candidates }
          : {}),
      });
    }
  }

  for (const e of sortedBy(session_version.argument_edges, (x) => x.id)) {
    if (!nodeIds.has(e.target)) {
      // Use the prior target's node type when available; default to a
      // permissive type (Interpretation) so the heuristic still finds
      // candidates if the snapshot is missing.
      const prior_target = prior_nodes_by_id.get(e.target);
      const required_type: NodeType = prior_target?.type ?? "Interpretation";
      const suggestion = suggestReattach(e.target, required_type);
      out.push({
        carrier_kind: "argument_edge",
        carrier_id: e.id,
        // Repository rewrites edge endpoints by node id, so the resolution
        // key is the missing target (not the edge id).
        source_node_id: e.target,
        display_summary: `${e.type} edge targets missing node ${e.target}.`,
        suggested_kind: suggestion.suggested_kind,
        ...(suggestion.reattach_candidates
          ? { reattach_candidates: suggestion.reattach_candidates }
          : {}),
      });
    }
  }

  for (const r of sortedBy(session_version.checkpoint_responses, (x) => x.checkpoint_id)) {
    if (!nodeIds.has(r.checkpoint_id)) {
      const suggestion = suggestReattach(r.checkpoint_id, "Checkpoint");
      out.push({
        carrier_kind: "checkpoint_answer",
        carrier_id: r.checkpoint_id,
        source_node_id: r.checkpoint_id,
        display_summary: `Answer for missing checkpoint ${r.checkpoint_id}.`,
        suggested_kind: suggestion.suggested_kind,
        ...(suggestion.reattach_candidates
          ? { reattach_candidates: suggestion.reattach_candidates }
          : {}),
      });
    }
  }

  for (const sel of sortedBy(session_version.interpretation_selections, (x) => x.term_id)) {
    if (!nodeIds.has(sel.term_id)) {
      const suggestion = suggestReattach(sel.term_id, "Term");
      out.push({
        carrier_kind: "interpretation_selection",
        carrier_id: sel.term_id,
        source_node_id: sel.term_id,
        display_summary: `Selection for missing term ${sel.term_id}.`,
        suggested_kind: suggestion.suggested_kind,
        ...(suggestion.reattach_candidates
          ? { reattach_candidates: suggestion.reattach_candidates }
          : {}),
      });
    }
  }

  for (const a of sortedBy(session_version.session_authorities ?? [], (x) => x.id)) {
    // session_authorities are by definition session-scope; we report unused
    // ones (no Premise.authority_ref points at them in the new session
    // shape) as candidates the user can review. Reattach doesn't apply
    // structurally — session authorities aren't anchored in the frame.
    let referenced = false;
    for (const p of session_version.premises) {
      if (p.authority_ref === a.id) {
        referenced = true;
        break;
      }
    }
    if (!referenced) {
      out.push({
        carrier_kind: "session_authority",
        carrier_id: a.id,
        source_node_id: a.id,
        display_summary: `Session authority '${truncate(a.citation, 60)}' is unreferenced.`,
        suggested_kind: "no_op",
      });
    }
  }

  return out;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const part of s.toLowerCase().split(/\W+/g)) {
    if (part.length > 0) out.add(part);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

export function rankPremiseReuse(
  candidates: ReadonlyArray<Premise>,
  context: { node: Node; frame_version: FrameVersion },
): ReadonlyArray<PremiseReuseSuggestion> {
  void context.frame_version;
  const seed = nodeSeedText(context.node);
  const seedTokens = tokenize(seed);

  const scored = candidates.map((p) => ({
    premise: p,
    jaccard: jaccard(seedTokens, tokenize(p.statement)),
  }));

  // Stable sort: jaccard descending, then premise id ascending.
  scored.sort((a, b) => {
    if (b.jaccard !== a.jaccard) return b.jaccard - a.jaccard;
    return a.premise.id.localeCompare(b.premise.id);
  });

  return scored.map((s) => ({ premise_id: s.premise.id, score: s.jaccard }));
}

function nodeSeedText(node: Node): string {
  switch (node.type) {
    case "RootQuestion":
    case "SubQuestion":
    case "Interpretation":
    case "Conclusion":
      return node.statement;
    case "Term":
      return node.name;
    case "Checkpoint":
      return node.question;
    case "Authority":
      return node.citation;
    case "Premise":
      return node.statement;
    case "LogicalGate":
      return node.gate_type;
  }
}
