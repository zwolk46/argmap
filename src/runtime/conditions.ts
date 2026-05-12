// Per-condition implementations of the 12-condition satisfaction library
// (Article II § 3 and the schema's satisfaction-policy module). Plus the
// policy evaluator that walks all_of + at-most-one any_of group.
//
// Every condition function is pure and order-stable. It consults frame,
// session, and the in-progress status_map (which contains children's statuses
// but not the current node's, since computation is reverse-topological).

import type {
  Node,
  FrameVersion,
  ArgumentSession,
  NodeRef,
  NodeStatus,
  Premise,
  Authority,
  Term,
  Condition,
  SatisfactionPolicy,
  BurdenLevel,
  BurdenThresholdMap,
  Jurisdiction,
} from "@/schema";
import { isTerm } from "@/schema";
import { sortedBy, sortedIter } from "./iteration-helpers";
import { isBinding } from "./authority-binding";

export type ConditionViaLabel =
  | "binding_authority"
  | "persuasive_authority"
  | "stipulation"
  | "structural_resolution"
  | "default";

export interface ConditionResult {
  passed: boolean;
  via: ReadonlyArray<ConditionViaLabel>;
}

export interface PolicyResult {
  passed: boolean;
  via: ReadonlyArray<ConditionViaLabel>;
  failed: ReadonlyArray<string>;
}

const PREMISE_KIND_WEIGHT_LEGAL: Readonly<Record<string, number>> = {
  stipulated: 100,
  found: 70,
  disputed: 30,
  procedural: 50,
};
const PREMISE_KIND_WEIGHT_ACADEMIC: Readonly<Record<string, number>> = {
  stipulated: 100,
  empirical: 70,
  definitional: 50,
  normative: 30,
};
const PREMISE_KIND_WEIGHT_PERSONAL: Readonly<Record<string, number>> = {
  stipulated: 100,
  observation: 60,
  value: 40,
  assumption: 20,
};
const EDGE_WEIGHT_MULTIPLIER: Readonly<Record<string, number>> = {
  strong: 1.0,
  moderate: 0.66,
  weak: 0.33,
};
const DEFAULT_BURDEN_THRESHOLD: Readonly<Record<BurdenLevel, number>> = {
  scintilla: 25,
  preponderance: 50,
  substantial_evidence: 60,
  clear_and_convincing: 80,
  beyond_reasonable_doubt: 95,
};

// FrameVersion does not carry Frame.mode or Frame.flavor. Inference path:
// presence of any Conclusion with direction.kind === "legal" → legal mode.
// Otherwise general; flavor defaults to academic (unmatched kinds fall back
// to default weight 30, so flavor-mismatch is benign). Downstream sessions
// holding the parent Frame may extend this surface to pass mode/flavor
// explicitly without changing condition signatures.
function inferLegal(frame: FrameVersion): boolean {
  for (const n of sortedBy(frame.nodes, (x) => x.id)) {
    if (n.type === "Conclusion" && n.direction.kind === "legal") return true;
  }
  return false;
}

function inferPersonalFlavor(frame: FrameVersion, session: ArgumentSession): boolean {
  // Hint at "personal" from Premise kinds: presence of any premise whose kind
  // is in {observation, value, assumption} biases toward personal flavor.
  // Academic kinds {empirical, definitional, normative} bias the other way.
  let personalSignals = 0;
  let academicSignals = 0;
  const premisePool = [...frame.nodes, ...session.premises];
  for (const n of sortedBy(premisePool, (x) => x.id)) {
    if (n.type !== "Premise") continue;
    const k = (n as Premise).kind;
    if (k === "observation" || k === "value" || k === "assumption") personalSignals++;
    else if (k === "empirical" || k === "definitional" || k === "normative") academicSignals++;
  }
  return personalSignals > academicSignals;
}

function pickKindWeights(
  frame: FrameVersion,
  session: ArgumentSession,
): Readonly<Record<string, number>> {
  if (inferLegal(frame)) return PREMISE_KIND_WEIGHT_LEGAL;
  if (inferPersonalFlavor(frame, session)) return PREMISE_KIND_WEIGHT_PERSONAL;
  return PREMISE_KIND_WEIGHT_ACADEMIC;
}

function thresholdsFor(frame: FrameVersion): Readonly<Record<BurdenLevel, number>> {
  const snapshot = frame.llm_settings_snapshot?.calibrated_thresholds;
  if (snapshot) {
    return snapshot as BurdenThresholdMap;
  }
  return DEFAULT_BURDEN_THRESHOLD;
}

function ok(via: ReadonlyArray<ConditionViaLabel> = []): ConditionResult {
  return { passed: true, via };
}
function fail(): ConditionResult {
  return { passed: false, via: [] };
}

// ----- premise_attached
function condPremiseAttached(
  node: Node,
  _frame: FrameVersion,
  session: ArgumentSession,
): ConditionResult {
  if (node.type !== "Checkpoint") return fail();
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.type !== "ANSWERS") continue;
    if (e.target === node.id) return ok();
  }
  return fail();
}

// ----- interpretation_selected (follows Term.linked_to chain)
function termChainEnd(node: Term, frame: FrameVersion): Term {
  const seen = new Set<NodeRef>();
  let cur: Term = node;
  while (cur.linked_to) {
    if (seen.has(cur.id)) break; // defensive cycle break (V-NODE-3 forbids)
    seen.add(cur.id);
    const next = frame.nodes.find((n) => n.id === cur.linked_to);
    if (!next || !isTerm(next)) break;
    cur = next;
  }
  return cur;
}

function condInterpretationSelected(
  node: Node,
  frame: FrameVersion,
  session: ArgumentSession,
): ConditionResult {
  if (node.type !== "Term") return fail();
  const target = termChainEnd(node, frame);
  for (const sel of sortedBy(session.interpretation_selections, (s) => s.term_id)) {
    if (sel.term_id !== target.id) continue;
    if (sel.selected_interpretation_ids.length >= 1) return ok();
  }
  return fail();
}

// ----- all_children_resolved
const CHILD_STRUCTURAL_TYPES = new Set<string>(["DECOMPOSES_INTO", "TURNS_ON", "LEADS_TO"]);
function condAllChildrenResolved(
  node: Node,
  frame: FrameVersion,
  _session: ArgumentSession,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ConditionResult {
  if (node.type !== "RootQuestion" && node.type !== "SubQuestion" && node.type !== "Conclusion") {
    return fail();
  }
  const children: NodeRef[] = [];
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.source !== node.id) continue;
    if (!CHILD_STRUCTURAL_TYPES.has(e.type)) continue;
    children.push(e.target);
  }
  if (children.length === 0) return fail();
  const acc = new Set<ConditionViaLabel>();
  for (const cid of sortedBy(children, (x) => x)) {
    const st = status_map.get(cid);
    if (!st) return fail();
    if (st.status === "satisfied") {
      for (const v of st.via ?? []) acc.add(v as ConditionViaLabel);
      continue;
    }
    if (st.status === "foreclosed") continue;
    return fail();
  }
  return { passed: true, via: sortedIter(acc) };
}

// ----- path_complete
function condPathComplete(
  node: Node,
  frame: FrameVersion,
  _session: ArgumentSession,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ConditionResult {
  if (node.type !== "Conclusion") return fail();
  // Walk reverse-incoming from the Conclusion until reaching a RootQuestion.
  // A path is satisfying if every node on it has status "satisfied" or
  // "foreclosed" (decided is encoded as satisfied via "structural_resolution"
  // — see status.ts; foreclosed-moot stays as foreclosed and is permitted by
  // the rule that foreclosed children do not block parent satisfaction).
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  const inByTarget = new Map<NodeRef, NodeRef[]>();
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (!CHILD_STRUCTURAL_TYPES.has(e.type)) continue;
    let arr = inByTarget.get(e.target);
    if (!arr) {
      arr = [];
      inByTarget.set(e.target, arr);
    }
    arr.push(e.source);
  }
  // DFS over reverse-incoming chain. Each path that reaches a RootQuestion
  // through "satisfied/foreclosed" nodes counts.
  const acc = new Set<ConditionViaLabel>();
  const seen = new Set<NodeRef>();
  function dfs(cur: NodeRef, pathVia: Set<ConditionViaLabel>): boolean {
    if (seen.has(cur)) return false;
    seen.add(cur);
    const curNode = nodeMap.get(cur);
    if (!curNode) return false;
    if (curNode.type === "RootQuestion") {
      for (const v of pathVia) acc.add(v);
      return true;
    }
    const parents = inByTarget.get(cur) ?? [];
    for (const pid of sortedBy(parents, (x) => x)) {
      const st = status_map.get(pid);
      if (!st) continue;
      if (st.status !== "satisfied" && st.status !== "foreclosed") continue;
      const childVia = new Set(pathVia);
      for (const v of st.via ?? []) childVia.add(v as ConditionViaLabel);
      if (dfs(pid, childVia)) {
        // continue exploring other parents for via accumulation but record success
        // (we already added pathVia into acc through the recursive call).
      }
    }
    return false; // function reports whether THIS branch reached root, but `acc`
    // is the union from successful branches; the boolean return is unused here.
  }
  // Start: any parent whose status is satisfied or foreclosed is a candidate.
  // We treat the Conclusion's own status as not-yet-known (we're computing it).
  const myParents = inByTarget.get(node.id) ?? [];
  let anyComplete = false;
  for (const pid of sortedBy(myParents, (x) => x)) {
    const st = status_map.get(pid);
    if (!st) continue;
    if (st.status !== "satisfied" && st.status !== "foreclosed") continue;
    const localVia = new Set<ConditionViaLabel>();
    for (const v of st.via ?? []) localVia.add(v as ConditionViaLabel);
    seen.clear();
    if (dfs(pid, localVia)) {
      anyComplete = true;
    }
  }
  if (!anyComplete) return fail();
  return { passed: true, via: sortedIter(acc) };
}

// ----- not_contradicted
function condNotContradicted(
  node: Node,
  _frame: FrameVersion,
  session: ArgumentSession,
): ConditionResult {
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.type !== "CONTRADICTS") continue;
    if (e.target === node.id) return fail();
  }
  return ok();
}

// ----- premise_kind_in
function condPremiseKindIn(
  node: Node,
  _frame: FrameVersion,
  session: ArgumentSession,
  kinds: ReadonlyArray<string>,
): ConditionResult {
  const allowed = new Set(kinds);
  const premisesById = new Map<NodeRef, Premise>();
  for (const p of session.premises) premisesById.set(p.id, p);
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.type !== "ANSWERS" && e.type !== "SUPPORTS" && e.type !== "CONTRADICTS") continue;
    if (e.target !== node.id) continue;
    const prem = premisesById.get(e.source);
    if (!prem) continue;
    if (allowed.has(prem.kind)) return ok();
  }
  return fail();
}

// ----- burden_met
function condBurdenMet(
  node: Node,
  frame: FrameVersion,
  session: ArgumentSession,
  level: BurdenLevel,
): ConditionResult {
  if (node.type !== "Checkpoint") return fail();
  const thresholds = thresholdsFor(frame);
  const threshold = thresholds[level];
  const weightTable = pickKindWeights(frame, session);
  let score = 0;
  const via = new Set<ConditionViaLabel>();
  const premisesById = new Map<NodeRef, Premise>();
  for (const p of session.premises) premisesById.set(p.id, p);
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.target !== node.id) continue;
    if (e.type !== "SUPPORTS" && e.type !== "ANSWERS" && e.type !== "CONTRADICTS") continue;
    const prem = premisesById.get(e.source);
    if (!prem) continue;
    const kw = weightTable[prem.kind] ?? 30;
    const eWeight = (e as { weight?: "strong" | "moderate" | "weak" }).weight ?? "moderate";
    const ew = EDGE_WEIGHT_MULTIPLIER[eWeight] ?? 0.66;
    if (e.type === "SUPPORTS" || e.type === "ANSWERS") {
      score += kw * ew;
      if (prem.kind === "stipulated") via.add("stipulation");
    } else {
      score -= kw * ew;
    }
  }
  return { passed: score >= threshold, via: sortedIter(via) };
}

// ----- authority_required
function condAuthorityRequired(
  node: Node,
  _frame: FrameVersion,
  session: ArgumentSession,
): ConditionResult {
  if (node.type !== "Checkpoint") return fail();
  const premisesById = new Map<NodeRef, Premise>();
  for (const p of session.premises) premisesById.set(p.id, p);
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.type !== "ANSWERS") continue;
    if (e.target !== node.id) continue;
    const prem = premisesById.get(e.source);
    if (!prem) continue;
    if (prem.authority_ref) return ok();
  }
  return fail();
}

// ----- authority_binding
function lookupAuthority(
  id: NodeRef,
  frame: FrameVersion,
  session: ArgumentSession,
): Authority | undefined {
  for (const n of frame.nodes) {
    if (n.id === id && n.type === "Authority") return n;
  }
  for (const a of session.session_authorities ?? []) {
    if (a.id === id && a.type === "Authority") return a;
  }
  return undefined;
}

function condAuthorityBinding(
  node: Node,
  frame: FrameVersion,
  session: ArgumentSession,
  jurisdiction_default: Jurisdiction | undefined,
): ConditionResult {
  const cited: Authority[] = [];
  // Frame-layer CITES edges from Authority → this node (V-EDGE-1 restricts to Interpretation).
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.type !== "CITES") continue;
    if (e.target !== node.id) continue;
    const a = lookupAuthority(e.source, frame, session);
    if (a) cited.push(a);
  }
  // Argument-layer: Premises with authority_ref reaching this node via ANSWERS/SUPPORTS.
  const premisesById = new Map<NodeRef, Premise>();
  for (const p of session.premises) premisesById.set(p.id, p);
  for (const p of sortedBy(session.premises, (x) => x.id)) {
    if (!p.authority_ref) continue;
    let reaches = false;
    for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
      if (e.source !== p.id) continue;
      if (e.target !== node.id) continue;
      if (e.type !== "ANSWERS" && e.type !== "SUPPORTS") continue;
      reaches = true;
      break;
    }
    if (!reaches) continue;
    const a = lookupAuthority(p.authority_ref, frame, session);
    if (a) cited.push(a);
  }
  if (!jurisdiction_default) {
    return cited.length > 0 ? { passed: false, via: ["persuasive_authority"] } : fail();
  }
  const via = new Set<ConditionViaLabel>();
  let anyBinding = false;
  for (const auth of sortedBy(cited, (x) => x.id)) {
    const result = isBinding(auth, jurisdiction_default);
    if (result.binding) {
      via.add("binding_authority");
      anyBinding = true;
    } else {
      via.add("persuasive_authority");
    }
  }
  return { passed: anyBinding, via: sortedIter(via) };
}

// ----- not_distinguished
function condNotDistinguished(
  node: Node,
  frame: FrameVersion,
  _session: ArgumentSession,
): ConditionResult {
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (e.type !== "DISTINGUISHED_BY") continue;
    if (e.target === node.id) return fail();
  }
  return ok();
}

// ----- standard_of_review_applied
function condStandardOfReviewApplied(
  node: Node,
  frame: FrameVersion,
  _session: ArgumentSession,
): ConditionResult {
  function getSoR(n: Node): string | undefined {
    if (n.type === "RootQuestion" || n.type === "SubQuestion") {
      return (n as { standard_of_review?: string }).standard_of_review;
    }
    return undefined;
  }
  const direct = getSoR(node);
  if (direct && direct.length > 0) return ok();
  // Ascend reverse-incoming through structural edges.
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  const inByTarget = new Map<NodeRef, NodeRef[]>();
  for (const e of sortedBy(frame.edges, (x) => x.id)) {
    if (!CHILD_STRUCTURAL_TYPES.has(e.type)) continue;
    let arr = inByTarget.get(e.target);
    if (!arr) {
      arr = [];
      inByTarget.set(e.target, arr);
    }
    arr.push(e.source);
  }
  const visited = new Set<NodeRef>();
  const queue: NodeRef[] = [node.id];
  while (queue.length > 0) {
    const cur = queue.shift() as NodeRef;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const parents = inByTarget.get(cur) ?? [];
    for (const pid of sortedBy(parents, (x) => x)) {
      const pn = nodeMap.get(pid);
      if (!pn) continue;
      const sor = getSoR(pn);
      if (sor && sor.length > 0) return ok();
      queue.push(pid);
    }
  }
  return fail();
}

// ----- not_foreclosed (universal; pass-when-reached at phase 4)
function condNotForeclosed(): ConditionResult {
  return ok();
}

export function evaluateCondition(
  condition: Condition,
  node: Node,
  frame: FrameVersion,
  session: ArgumentSession,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  jurisdiction_default?: Jurisdiction,
): ConditionResult {
  switch (condition.kind) {
    case "premise_attached":
      return condPremiseAttached(node, frame, session);
    case "interpretation_selected":
      return condInterpretationSelected(node, frame, session);
    case "all_children_resolved":
      return condAllChildrenResolved(node, frame, session, status_map);
    case "path_complete":
      return condPathComplete(node, frame, session, status_map);
    case "not_contradicted":
      return condNotContradicted(node, frame, session);
    case "premise_kind_in":
      return condPremiseKindIn(node, frame, session, condition.kinds);
    case "burden_met":
      return condBurdenMet(node, frame, session, condition.level);
    case "authority_required":
      return condAuthorityRequired(node, frame, session);
    case "authority_binding":
      return condAuthorityBinding(node, frame, session, jurisdiction_default);
    case "not_distinguished":
      return condNotDistinguished(node, frame, session);
    case "standard_of_review_applied":
      return condStandardOfReviewApplied(node, frame, session);
    case "not_foreclosed":
      return condNotForeclosed();
  }
}

export function evaluatePolicy(
  policy: SatisfactionPolicy,
  node: Node,
  frame: FrameVersion,
  session: ArgumentSession,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  jurisdiction_default?: Jurisdiction,
): PolicyResult {
  const via = new Set<ConditionViaLabel>();
  const failed: string[] = [];
  for (const cond of policy.all_of) {
    const r = evaluateCondition(cond, node, frame, session, status_map, jurisdiction_default);
    for (const v of r.via) via.add(v);
    if (!r.passed) failed.push(cond.kind);
  }
  if (policy.any_of && policy.any_of.length > 0) {
    let anyPassed = false;
    for (const cond of policy.any_of) {
      const r = evaluateCondition(cond, node, frame, session, status_map, jurisdiction_default);
      if (r.passed) {
        anyPassed = true;
        for (const v of r.via) via.add(v);
      }
    }
    if (!anyPassed) failed.push("any_of_group_unsatisfied");
  }
  return {
    passed: failed.length === 0,
    via: sortedIter(via),
    failed: [...failed],
  };
}
