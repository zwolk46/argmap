// Phase 2 of the compute pipeline (Stream C2).
//
// Composes two independent sources of "direct" foreclosure — explicit FORECLOSES
// edges sourced from selected Interpretations, and dispositive Term auto-
// foreclosure — then cascades forward along the structural sub-graph. Output is
// a ReadonlySet<NodeRef> consumed by phases 3, 4, and 5.

import type { FrameVersion, ArgumentSession, NodeRef, Term, ForeclosesEdge } from "@/schema";
import { isTerm } from "@/schema";
import { sortedBy } from "./iteration-helpers";
import { findRoot, forwardReach, type Graph } from "./graph";

export type ForeclosureScope = "moot" | "decided";

type SessionLike = Pick<ArgumentSession, "interpretation_selections">;

function collectSelectedInterpretationIds(session: SessionLike): Set<NodeRef> {
  const out = new Set<NodeRef>();
  // Sort selections by term_id for stable iteration; selected ids are added
  // regardless of order (Set semantics), but we walk deterministically.
  const sels = sortedBy(session.interpretation_selections, (s) => s.term_id);
  for (const sel of sels) {
    for (const iid of sortedBy(sel.selected_interpretation_ids, (x) => x)) {
      out.add(iid);
    }
  }
  return out;
}

function collectExplicitForeclosed(
  frame: FrameVersion,
  selectedInterpretationIds: ReadonlySet<NodeRef>,
): Set<NodeRef> {
  const out = new Set<NodeRef>();
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.type !== "FORECLOSES") continue;
    if (!selectedInterpretationIds.has(e.source)) continue;
    out.add(e.target);
  }
  return out;
}

interface ParentChildTerms {
  parent_id: NodeRef;
  terms: Term[];
}

function collectQuestionTerms(frame: FrameVersion): ParentChildTerms[] {
  // For each RootQuestion / SubQuestion parent, collect its child Terms via
  // TURNS_ON edges. Walk edges in lex-id order so the per-parent term order
  // is fully deterministic before the (order, id) sort below.
  const byParent = new Map<NodeRef, Term[]>();
  const nodeMap = new Map<NodeRef, Term>();
  for (const n of frame.nodes) {
    if (isTerm(n)) nodeMap.set(n.id, n);
  }
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.type !== "TURNS_ON") continue;
    const term = nodeMap.get(e.target);
    if (!term) continue;
    let arr = byParent.get(e.source);
    if (!arr) {
      arr = [];
      byParent.set(e.source, arr);
    }
    arr.push(term);
  }
  const out: ParentChildTerms[] = [];
  // Iterate parents in lex-sorted id order so the auto-foreclosure pass is
  // deterministic across input permutations.
  const pairs: Array<[NodeRef, Term[]]> = [];
  for (const pair of byParent) pairs.push(pair);
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [pid, terms] of pairs) {
    out.push({ parent_id: pid, terms });
  }
  return out;
}

function collectDispositiveForeclosed(frame: FrameVersion, session: SessionLike): Set<NodeRef> {
  const out = new Set<NodeRef>();
  // Map term_id -> whether the session has at least one InterpretationSelection
  // with a non-empty selected list.
  const termHasSelection = new Set<NodeRef>();
  for (const sel of session.interpretation_selections) {
    if (sel.selected_interpretation_ids.length > 0) {
      termHasSelection.add(sel.term_id);
    }
  }

  for (const group of collectQuestionTerms(frame)) {
    if (group.terms.length === 0) continue;
    // Sort children by (order, id) — order primary, lex-id tiebreaker.
    const sorted = [...group.terms].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.id.localeCompare(b.id);
    });
    let winnerIndex = -1;
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      if (t.dispositive && termHasSelection.has(t.id)) {
        winnerIndex = i;
        break;
      }
    }
    if (winnerIndex < 0) continue;
    for (let i = 0; i < sorted.length; i++) {
      if (i === winnerIndex) continue;
      out.add(sorted[i].id);
    }
  }
  return out;
}

export function resolveForeclosure(
  frame: FrameVersion,
  session: SessionLike,
  graph: Graph,
): ReadonlySet<NodeRef> {
  const selectedIds = collectSelectedInterpretationIds(session);
  const explicit = collectExplicitForeclosed(frame, selectedIds);
  const dispositive = collectDispositiveForeclosed(frame, session);
  const direct = new Set<NodeRef>();
  for (const id of explicit) direct.add(id);
  for (const id of dispositive) direct.add(id);

  // Cascade: a node strictly downstream of any direct node along the
  // structural sub-graph is foreclosed iff it is not reachable from the
  // RootQuestion via some path that skips direct.
  let root;
  try {
    root = findRoot(frame);
  } catch {
    // Defensive: if root is missing, the orchestrator already short-circuits
    // to incomplete output; return the direct set unmodified.
    return direct;
  }
  const liveReach = new Set(forwardReach(root.id, graph, direct));
  const fullReach = new Set(forwardReach(root.id, graph));
  const result = new Set<NodeRef>();
  for (const id of fullReach) {
    if (!liveReach.has(id)) result.add(id);
  }
  for (const id of direct) result.add(id);
  return result;
}

export function foreclosureScopeFor(
  node_id: NodeRef,
  frame: FrameVersion,
  session: SessionLike,
): ForeclosureScope {
  const selectedIds = collectSelectedInterpretationIds(session);
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.type !== "FORECLOSES") continue;
    if (e.target !== node_id) continue;
    if (!selectedIds.has(e.source)) continue;
    const fe = e as ForeclosesEdge;
    if (fe.scope === "decided") return "decided";
  }
  return "moot";
}
