// Phase 5 of the compute pipeline (Stream C1 + C4). Pure.
//
// Produces active_path, ConditionalOutput, open_gates, and the confidence
// breakdown. Output shape ladder: incomplete > contested > conditional >
// determinate. Prose summary is a deterministic template walk (no LLM, no
// clock, no randomness).

import type {
  FrameVersion,
  ArgumentSession,
  NodeRef,
  NodeStatus,
  ConditionalOutput,
  ConditionalBranch,
  OpenGate,
  ConfidenceBreakdown,
  Node,
  Checkpoint,
  CheckpointOption,
  ConclusionDirection,
  Conclusion,
  ValidationResult,
} from "@/schema";
import { isCheckpoint, isLogicalGate, isTerm } from "@/schema";
import { sortedBy, sortedIter } from "./iteration-helpers";
import { type Graph } from "./graph";
import { evaluateGate } from "./gates";

interface WalkAcc {
  segments: NodeRef[][];
  open_gates: OpenGate[];
  branches: ConditionalBranch[];
}

function selectedInterpretationsFor(termId: NodeRef, session: ArgumentSession): Set<NodeRef> {
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
  session: ArgumentSession,
): { selected_option_id: string } | undefined {
  for (const r of sortedBy(session.checkpoint_responses, (x) => x.checkpoint_id)) {
    if (r.checkpoint_id === checkpointId) return r;
  }
  return undefined;
}

function hasContradictingPremise(nodeId: NodeRef, session: ArgumentSession): boolean {
  for (const e of session.argument_edges) {
    if (e.type === "CONTRADICTS" && e.target === nodeId) return true;
  }
  return false;
}

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function deterministicId(input: string): string {
  const a = fnv1a32(input).toString(16).padStart(8, "0");
  const b = fnv1a32(input + "\x01")
    .toString(16)
    .padStart(8, "0");
  return a + b;
}

function branchIdFromConditions(checkpointId: NodeRef, optionId: string): string {
  return `br_${deterministicId(`${checkpointId}::${optionId}`)}`;
}

function branchIdFromGate(gateId: NodeRef, slotName: string, value: string): string {
  return `br_${deterministicId(`${gateId}::${slotName}::${value}`)}`;
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function renderNodeShort(nid: NodeRef, frame: FrameVersion): string {
  const node = frame.nodes.find((n) => n.id === nid);
  if (!node) return nid;
  let raw: string;
  switch (node.type) {
    case "RootQuestion":
    case "SubQuestion":
      raw = node.statement;
      break;
    case "Term":
      raw = node.name;
      break;
    case "Interpretation":
      raw = node.statement;
      break;
    case "Checkpoint":
      raw = node.question;
      break;
    case "LogicalGate":
      raw = `${node.gate_type} gate`;
      break;
    case "Conclusion":
      raw = node.statement;
      break;
    case "Authority":
      raw = node.citation;
      break;
    case "Premise":
      raw = node.statement;
      break;
  }
  return truncate(raw);
}

function renderDirection(direction: ConclusionDirection, _frame: FrameVersion): string {
  if (direction.kind === "legal") {
    if (direction.value === "custom" && direction.custom_label) return direction.custom_label;
    return direction.value;
  }
  // FrameVersion does not carry Frame.positions; render via custom_label or id.
  if (direction.custom_label) return direction.custom_label;
  return direction.position_id;
}

function walkAssuming(
  start: NodeRef,
  _frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  assumption:
    | { kind: "checkpoint"; node_id: NodeRef; option_id: string }
    | { kind: "gate"; node_id: NodeRef; result: "satisfied" | "not_satisfied" },
): NodeRef[] {
  // Hypothetical DFS from `start`. Treats the assumption as locally resolved.
  const out: NodeRef[] = [];
  const seen = new Set<NodeRef>();
  function step(nid: NodeRef): boolean {
    if (foreclosed.has(nid)) return false;
    if (seen.has(nid)) return false;
    seen.add(nid);
    out.push(nid);
    const node = graph.nodeById(nid);
    if (node.type === "Conclusion") return true;
    const nextTargets: NodeRef[] = [];
    if (isCheckpoint(node)) {
      const r = responseFor(node.id, session);
      let optId: string | undefined;
      if (assumption.kind === "checkpoint" && assumption.node_id === node.id) {
        optId = assumption.option_id;
      } else if (r) {
        optId = r.selected_option_id;
      }
      if (optId) {
        const opt = node.options.find((o) => o.id === optId);
        if (opt?.target_node_id) nextTargets.push(opt.target_node_id);
      }
    } else if (isLogicalGate(node)) {
      let routes = false;
      if (assumption.kind === "gate" && assumption.node_id === node.id) {
        routes = assumption.result === "satisfied";
      } else {
        routes = evaluateGate(node, status_map) === "satisfied";
      }
      if (routes) {
        for (const edge of graph.outTraversal(node.id)) {
          if (edge.type === "GATES") nextTargets.push(edge.target);
        }
      }
    } else if (isTerm(node)) {
      const sel = selectedInterpretationsFor(node.id, session);
      for (const iid of sortedBy([...sel], (x) => x)) nextTargets.push(iid);
    } else {
      for (const edge of graph.outTraversal(node.id)) {
        if (
          edge.type === "DECOMPOSES_INTO" ||
          edge.type === "TURNS_ON" ||
          edge.type === "LEADS_TO"
        ) {
          nextTargets.push(edge.target);
        }
      }
    }
    for (const t of sortedBy(nextTargets, (x) => x)) {
      if (step(t)) return true;
    }
    // Backtrack: this path did not reach a Conclusion.
    out.pop();
    return false;
  }
  step(start);
  return out;
}

function branchesFromUnresolvedCheckpoint(
  node: Checkpoint,
  prefix: NodeRef[],
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ConditionalBranch[] {
  const out: ConditionalBranch[] = [];
  for (const opt of sortedBy(node.options, (x) => x.id)) {
    if (!opt.target_node_id || foreclosed.has(opt.target_node_id)) continue;
    const sub = walkAssuming(opt.target_node_id, frame, session, graph, foreclosed, status_map, {
      kind: "checkpoint",
      node_id: node.id,
      option_id: opt.id,
    });
    if (sub.length === 0) continue;
    const terminal = sub[sub.length - 1];
    if (graph.nodeById(terminal).type !== "Conclusion") continue;
    out.push({
      id: branchIdFromConditions(node.id, opt.id),
      conditions: [
        {
          gate_node_id: node.id,
          required_value: opt.id,
          required_value_label: opt.label,
        },
      ],
      resulting_conclusion: terminal,
      intermediate_path: [...prefix, ...sub],
      prose: `If '${truncate(opt.label, 60)}' at ${truncate(node.question, 40)}: ${truncate(renderNodeShort(terminal, frame), 60)}.`,
    });
  }
  return out;
}

function branchesFromIndeterminateGate(
  node: Node,
  prefix: NodeRef[],
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ConditionalBranch[] {
  if (!isLogicalGate(node)) return [];
  const out: ConditionalBranch[] = [];
  for (const assumed of ["satisfied", "not_satisfied"] as const) {
    if (assumed === "satisfied") {
      // Routes through GATES targets.
      const gatesTargets: NodeRef[] = [];
      for (const edge of graph.outTraversal(node.id)) {
        if (edge.type === "GATES" && !foreclosed.has(edge.target)) {
          gatesTargets.push(edge.target);
        }
      }
      for (const t of sortedBy(gatesTargets, (x) => x)) {
        const sub = walkAssuming(t, frame, session, graph, foreclosed, status_map, {
          kind: "gate",
          node_id: node.id,
          result: "satisfied",
        });
        if (sub.length === 0) continue;
        const terminal = sub[sub.length - 1];
        if (graph.nodeById(terminal).type !== "Conclusion") continue;
        out.push({
          id: branchIdFromGate(node.id, "result", "satisfied"),
          conditions: [
            {
              gate_node_id: node.id,
              required_value: "satisfied",
              required_value_label: `${node.gate_type} gate satisfied`,
            },
          ],
          resulting_conclusion: terminal,
          intermediate_path: [...prefix, ...sub],
          prose: `If ${node.gate_type} gate satisfies: ${truncate(renderNodeShort(terminal, frame), 60)}.`,
        });
      }
    }
    // For "not_satisfied" branch, the gate does not route — no Conclusion reached.
  }
  return out;
}

function mergeConvergentBranches(
  branches: ConditionalBranch[],
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ConditionalBranch[] {
  const byConclusion = new Map<NodeRef, ConditionalBranch[]>();
  for (const b of branches) {
    let arr = byConclusion.get(b.resulting_conclusion);
    if (!arr) {
      arr = [];
      byConclusion.set(b.resulting_conclusion, arr);
    }
    arr.push(b);
  }
  const out: ConditionalBranch[] = [];
  const conclusionPairs: Array<[NodeRef, ConditionalBranch[]]> = [];
  for (const pair of byConclusion) conclusionPairs.push(pair);
  conclusionPairs.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [c, group] of conclusionPairs) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    // Pick representative by primary-path tiebreaker.
    const primary = pickPrimary(
      group.map((g) => g.intermediate_path),
      status_map,
    );
    const repr = group.find((g) => g.intermediate_path === primary) ?? group[0];
    const conditions = group.flatMap((g) => g.conditions);
    out.push({
      id: repr.id,
      conditions,
      resulting_conclusion: c,
      intermediate_path: repr.intermediate_path,
      prose: repr.prose,
    });
  }
  return out;
}

function pickPrimary(
  segments: ReadonlyArray<ReadonlyArray<NodeRef>>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): ReadonlyArray<NodeRef> {
  if (segments.length === 0) return [];
  // Score each segment: (satisfiedCount, bindingCount, lex(conclusionId)).
  const scored = segments.map((seg) => {
    let satisfied = 0;
    let binding = 0;
    for (const nid of seg) {
      const st = status_map.get(nid);
      if (st?.status === "satisfied") {
        satisfied++;
        if ((st.via ?? []).includes("binding_authority")) binding++;
      } else if (st?.status === "foreclosed") {
        // foreclosed counts as resolved for length purposes
        satisfied++;
      }
    }
    const conclusionId = seg[seg.length - 1] ?? "";
    return { seg, satisfied, binding, conclusionId };
  });
  scored.sort((a, b) => {
    if (b.satisfied !== a.satisfied) return b.satisfied - a.satisfied;
    if (b.binding !== a.binding) return b.binding - a.binding;
    return a.conclusionId.localeCompare(b.conclusionId);
  });
  return scored[0].seg;
}

function walkActive(
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  rootId: NodeRef,
): WalkAcc {
  const acc: WalkAcc = { segments: [], open_gates: [], branches: [] };

  function walk(nodeId: NodeRef, prefix: NodeRef[]): void {
    if (foreclosed.has(nodeId)) return;
    const status = status_map.get(nodeId);
    if (status?.status === "not_applicable") return;
    const newPrefix = [...prefix, nodeId];
    const node = graph.nodeById(nodeId);

    if (node.type === "Conclusion") {
      acc.segments.push(newPrefix);
      return;
    }

    const nextTargets: NodeRef[] = [];

    switch (node.type) {
      case "RootQuestion":
      case "SubQuestion":
        for (const e of graph.outTraversal(nodeId)) {
          if (e.type === "DECOMPOSES_INTO" || e.type === "TURNS_ON" || e.type === "LEADS_TO") {
            nextTargets.push(e.target);
          }
        }
        break;
      case "Term": {
        const sel = selectedInterpretationsFor(node.id, session);
        if (sel.size === 0) {
          acc.open_gates.push({
            node_id: nodeId,
            reason: "structural",
            prompt: `Pick an interpretation of '${truncate(node.name, 50)}'.`,
          });
          return;
        }
        for (const iid of sortedIter(sel)) {
          if (!foreclosed.has(iid)) nextTargets.push(iid);
        }
        break;
      }
      case "Interpretation":
        for (const e of graph.outTraversal(nodeId)) {
          if (e.type === "LEADS_TO") nextTargets.push(e.target);
        }
        break;
      case "Checkpoint": {
        const resp = responseFor(nodeId, session);
        if (!resp) {
          if (status?.status === "contested") {
            const subBranches = branchesFromUnresolvedCheckpoint(
              node,
              newPrefix,
              frame,
              session,
              graph,
              foreclosed,
              status_map,
            );
            for (const b of subBranches) acc.branches.push(b);
          } else {
            const reason: OpenGate["reason"] = hasContradictingPremise(nodeId, session)
              ? "premise_contradicted"
              : "no_premise";
            acc.open_gates.push({ node_id: nodeId, reason, prompt: truncate(node.question, 100) });
          }
          return;
        }
        const opt: CheckpointOption | undefined = node.options.find(
          (o) => o.id === resp.selected_option_id,
        );
        if (opt?.target_node_id && !foreclosed.has(opt.target_node_id)) {
          nextTargets.push(opt.target_node_id);
        }
        break;
      }
      case "LogicalGate": {
        const result = evaluateGate(node, status_map);
        if (result === "satisfied") {
          for (const e of graph.outTraversal(nodeId)) {
            if (e.type === "GATES" && !foreclosed.has(e.target)) {
              nextTargets.push(e.target);
            }
          }
        } else if (result === "indeterminate") {
          const subBranches = branchesFromIndeterminateGate(
            node,
            newPrefix,
            frame,
            session,
            graph,
            foreclosed,
            status_map,
          );
          for (const b of subBranches) acc.branches.push(b);
          acc.open_gates.push({
            node_id: nodeId,
            reason: "structural",
            prompt: `Resolve ${node.gate_type} gate inputs to settle this branch.`,
          });
          return;
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }

    for (const t of sortedBy(nextTargets, (x) => x)) walk(t, newPrefix);
  }

  walk(rootId, []);
  return acc;
}

function failedConditionsToOpenReason(
  failed: ReadonlyArray<string>,
): OpenGate["reason"] | undefined {
  if (failed.includes("burden_met")) return "burden_unmet";
  if (failed.includes("authority_required") || failed.includes("authority_binding")) {
    return "authority_missing";
  }
  return undefined;
}

function mergeOpenGates(
  fromWalk: ReadonlyArray<OpenGate>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  active_path: ReadonlyArray<NodeRef>,
  frame: FrameVersion,
): OpenGate[] {
  const byNode = new Map<NodeRef, OpenGate>();
  for (const og of fromWalk) {
    const prev = byNode.get(og.node_id);
    if (!prev) byNode.set(og.node_id, og);
    else if (prev.reason === "structural" && og.reason !== "structural") {
      byNode.set(og.node_id, og);
    }
  }
  for (const nid of active_path) {
    const st = status_map.get(nid);
    if (!st || st.status !== "open") continue;
    const node = frame.nodes.find((n) => n.id === nid);
    if (!node) continue;
    const reason = failedConditionsToOpenReason(st.failed_conditions ?? []);
    if (!reason) continue;
    const prev = byNode.get(nid);
    if (prev && prev.reason !== "structural") continue;
    let prompt = "";
    if (node.type === "Checkpoint") prompt = truncate(node.question, 100);
    else if (node.type === "RootQuestion" || node.type === "SubQuestion")
      prompt = truncate(node.statement, 100);
    else prompt = renderNodeShort(nid, frame);
    byNode.set(nid, { node_id: nid, reason, prompt });
  }
  const out: OpenGate[] = [];
  const pairs: Array<[NodeRef, OpenGate]> = [];
  for (const pair of byNode) pairs.push(pair);
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, v] of pairs) out.push(v);
  return out;
}

export function computeConfidenceBreakdown(
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  primary_path: ReadonlyArray<NodeRef>,
  frame: FrameVersion,
): ConfidenceBreakdown {
  const out: ConfidenceBreakdown = {
    total_checkpoints_on_path: 0,
    satisfied_via_binding: 0,
    satisfied_via_persuasive: 0,
    satisfied_via_stipulation: 0,
    satisfied_via_structural: 0,
    contested: 0,
    open: 0,
  };
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  for (const nid of primary_path) {
    const n = nodeMap.get(nid);
    if (!n || n.type !== "Checkpoint") continue;
    out.total_checkpoints_on_path++;
    const st = status_map.get(nid);
    if (!st) {
      out.open++;
      continue;
    }
    if (st.status === "satisfied") {
      const via = st.via ?? [];
      if (via.includes("binding_authority")) out.satisfied_via_binding++;
      else if (via.includes("persuasive_authority")) out.satisfied_via_persuasive++;
      else if (via.includes("stipulation")) out.satisfied_via_stipulation++;
      else if (via.includes("structural_resolution")) out.satisfied_via_structural++;
      else out.satisfied_via_persuasive++;
    } else if (st.status === "contested") {
      out.contested++;
    } else if (st.status === "open") {
      out.open++;
    }
  }
  return out;
}

function shapeFor(
  validation_results: ReadonlyArray<ValidationResult>,
  segments: ReadonlyArray<ReadonlyArray<NodeRef>>,
  branches: ReadonlyArray<ConditionalBranch>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  frame: FrameVersion,
): { shape: ConditionalOutput["shape"]; primary?: ReadonlyArray<NodeRef> } {
  if (validation_results.some((r) => r.severity === "error")) return { shape: "incomplete" };
  if (segments.length === 0) return { shape: "incomplete" };
  // Contested check: any Checkpoint on any segment that reaches a Conclusion is contested.
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  let hasContestedOnPath = false;
  for (const seg of segments) {
    for (const nid of seg) {
      const st = status_map.get(nid);
      if (st?.status === "contested") {
        hasContestedOnPath = true;
        break;
      }
    }
    if (hasContestedOnPath) break;
  }
  const primary = pickPrimary(segments, status_map);
  if (hasContestedOnPath) return { shape: "contested", primary };
  if (branches.length > 0) {
    // Distinct resulting conclusions?
    const conclusions = new Set<NodeRef>();
    for (const b of branches) conclusions.add(b.resulting_conclusion);
    if (conclusions.size > 1) return { shape: "conditional", primary };
  }
  return { shape: "determinate", primary };
}

function renderDeterminateProse(output: ConditionalOutput, frame: FrameVersion): string {
  if (!output.conclusion) return "No conclusion reached.";
  const concl = frame.nodes.find((n): n is Conclusion => n.id === output.conclusion);
  if (!concl) return "Conclusion not found.";
  const lines: string[] = [];
  lines.push(`Conclusion: ${truncate(concl.statement)}`);
  lines.push(`Direction: ${renderDirection(concl.direction, frame)}`);
  if (output.primary_path && output.primary_path.length > 0) {
    lines.push("");
    lines.push("Path:");
    for (const nid of output.primary_path) {
      lines.push(`  - ${renderNodeShort(nid, frame)}`);
    }
  }
  return lines.join("\n");
}

function renderConditionalProse(output: ConditionalOutput, frame: FrameVersion): string {
  const lines: string[] = ["Conditional outcome:"];
  for (const b of output.branches ?? []) {
    const concl = frame.nodes.find((n): n is Conclusion => n.id === b.resulting_conclusion);
    const conclStr = concl ? truncate(concl.statement) : b.resulting_conclusion;
    const conds = b.conditions.map((c) => `${truncate(c.required_value_label, 40)}`).join(" / ");
    lines.push(`  - If ${conds}: ${conclStr}`);
  }
  return lines.join("\n");
}

function renderContestedProse(output: ConditionalOutput, frame: FrameVersion): string {
  const lines: string[] = ["Contested outcome:"];
  const contested = output.contested_nodes ?? [];
  if (contested.length > 0) {
    lines.push("");
    lines.push("Contested points:");
    for (const nid of contested) {
      lines.push(`  - ${renderNodeShort(nid, frame)}`);
    }
  }
  if (output.best_inference) {
    const concl = frame.nodes.find((n): n is Conclusion => n.id === output.best_inference);
    if (concl) {
      lines.push("");
      lines.push(`Best inference: ${truncate(concl.statement)}`);
    }
  }
  return lines.join("\n");
}

function renderIncompleteProse(output: ConditionalOutput, frame: FrameVersion): string {
  const lines: string[] = ["Incomplete — open items remain:"];
  for (const og of output.open_gates ?? []) {
    lines.push(`  - ${truncate(og.prompt, 80)} (${og.reason})`);
  }
  void frame;
  return lines.join("\n");
}

export function renderProse(output: ConditionalOutput, frame: FrameVersion): string {
  switch (output.shape) {
    case "determinate":
      return renderDeterminateProse(output, frame);
    case "conditional":
      return renderConditionalProse(output, frame);
    case "contested":
      return renderContestedProse(output, frame);
    case "incomplete":
      return renderIncompleteProse(output, frame);
  }
}

function findContestedOnSegments(
  segments: ReadonlyArray<ReadonlyArray<NodeRef>>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  frame: FrameVersion,
): NodeRef[] {
  const out = new Set<NodeRef>();
  const nodeMap = new Map<NodeRef, Node>();
  for (const n of frame.nodes) nodeMap.set(n.id, n);
  for (const seg of segments) {
    for (const nid of seg) {
      const st = status_map.get(nid);
      if (st?.status === "contested") {
        const n = nodeMap.get(nid);
        if (n?.type === "Checkpoint") out.add(nid);
      }
    }
  }
  const ids: NodeRef[] = [];
  for (const id of out) ids.push(id);
  ids.sort((a, b) => a.localeCompare(b));
  return ids;
}

export function generateOutput(
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  active: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
  validation_results: ReadonlyArray<ValidationResult>,
  computed_at: string,
): {
  active_path: ReadonlyArray<NodeRef>;
  output: ConditionalOutput;
  open_gates: ReadonlyArray<OpenGate>;
} {
  // Find root.
  const roots = frame.nodes.filter((n) => n.type === "RootQuestion");
  const root = roots.length === 1 ? roots[0] : undefined;
  let acc: WalkAcc = { segments: [], open_gates: [], branches: [] };
  if (root && active.has(root.id)) {
    acc = walkActive(frame, session, graph, foreclosed, status_map, root.id);
  }

  const merged = mergeConvergentBranches(acc.branches, status_map);
  const { shape, primary } = shapeFor(validation_results, acc.segments, merged, status_map, frame);

  const active_path = primary ?? [];
  let conclusion: NodeRef | undefined;
  let primary_path: NodeRef[] | undefined;
  let best_inference: NodeRef | undefined;
  let contested_nodes: NodeRef[] | undefined;

  if (shape === "determinate") {
    if (active_path.length > 0) {
      const terminal = active_path[active_path.length - 1];
      if (frame.nodes.find((n) => n.id === terminal)?.type === "Conclusion") {
        conclusion = terminal;
        primary_path = [...active_path];
      }
    }
  } else if (shape === "contested") {
    contested_nodes = findContestedOnSegments(acc.segments, status_map, frame);
    if (active_path.length > 0) {
      const terminal = active_path[active_path.length - 1];
      if (frame.nodes.find((n) => n.id === terminal)?.type === "Conclusion") {
        best_inference = terminal;
      }
    }
  }

  const confidence_breakdown = computeConfidenceBreakdown(status_map, active_path, frame);
  const final_open_gates = mergeOpenGates(acc.open_gates, status_map, active_path, frame);

  const output: ConditionalOutput = {
    shape,
    prose_summary: "",
    computed_at,
    confidence_breakdown,
  };
  if (conclusion) output.conclusion = conclusion;
  if (primary_path) output.primary_path = primary_path;
  if (merged.length > 0 && shape === "conditional") output.branches = merged;
  if (contested_nodes && contested_nodes.length > 0) output.contested_nodes = contested_nodes;
  if (best_inference) output.best_inference = best_inference;
  if (final_open_gates.length > 0) output.open_gates = final_open_gates;
  output.prose_summary = renderProse(output, frame);

  return {
    active_path,
    output,
    open_gates: final_open_gates,
  };
}

export function traceActivePath(
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): {
  primary_path: ReadonlyArray<NodeRef>;
  all_segments: ReadonlyArray<ReadonlyArray<NodeRef>>;
  open_gates: ReadonlyArray<OpenGate>;
  branches: ReadonlyArray<ConditionalBranch>;
} {
  const roots = frame.nodes.filter((n) => n.type === "RootQuestion");
  if (roots.length !== 1) {
    return { primary_path: [], all_segments: [], open_gates: [], branches: [] };
  }
  const acc = walkActive(frame, session, graph, foreclosed, status_map, roots[0].id);
  const merged = mergeConvergentBranches(acc.branches, status_map);
  const primary = pickPrimary(acc.segments, status_map);
  return {
    primary_path: primary,
    all_segments: acc.segments,
    open_gates: acc.open_gates,
    branches: merged,
  };
}
