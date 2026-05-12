// The runtime orchestrator. Composes the five phases into the deterministic
// top-level `compute` function (Contract 2). Pure: identical inputs produce
// byte-identical outputs (Article II § 2). The wall clock is never read; the
// orchestrator threads `computed_at` from the caller into every NodeStatus
// and the ConditionalOutput.

import type {
  FrameVersion,
  ArgumentSession,
  NodeRef,
  ConditionalOutput,
  CheckpointResponse,
  InterpretationSelection,
  Premise,
  Edge,
  Authority,
  ValidationResult,
  NodeStatus,
  OpenGate,
  Jurisdiction,
} from "@/schema";
import { runValidation } from "@/schema";

import { buildGraph, RuntimeStructuralError } from "./graph";
import { resolveForeclosure } from "./foreclosure";
import { computeReachableSet, computeActiveSet } from "./reachable-active";
import { computeStatusMap } from "./status";
import { generateOutput } from "./output";

export interface ComputeInput {
  frame_version_snapshot: FrameVersion;
  checkpoint_responses: ReadonlyArray<CheckpointResponse>;
  interpretation_selections: ReadonlyArray<InterpretationSelection>;
  premises: ReadonlyArray<Premise>;
  argument_edges: ReadonlyArray<Edge>;
  session_authorities: ReadonlyArray<Authority>;
  computed_at: string;
  jurisdiction_default?: Jurisdiction;
}

export interface ComputeResult {
  validation_results: ReadonlyArray<ValidationResult>;
  foreclosed_set: ReadonlySet<NodeRef>;
  reachable_set: ReadonlySet<NodeRef>;
  active_set: ReadonlySet<NodeRef>;
  status_map: ReadonlyMap<NodeRef, NodeStatus>;
  active_path: ReadonlyArray<NodeRef>;
  output: ConditionalOutput;
  open_gates: ReadonlyArray<OpenGate>;
}

function incompleteOutput(
  frame: FrameVersion,
  validation_results: ReadonlyArray<ValidationResult>,
  computed_at: string,
): ConditionalOutput {
  const open_gates: OpenGate[] = validation_results
    .filter((r) => r.severity === "error")
    .map((r) => ({
      node_id: r.node_id ?? r.rule_id,
      reason: "structural" as const,
      prompt: r.message,
    }));
  void frame;
  return {
    shape: "incomplete",
    prose_summary: open_gates.length
      ? `Incomplete — open items remain:\n${open_gates
          .map((og) => `  - ${og.prompt} (${og.reason})`)
          .join("\n")}`
      : "Incomplete.",
    computed_at,
    confidence_breakdown: {
      total_checkpoints_on_path: 0,
      satisfied_via_binding: 0,
      satisfied_via_persuasive: 0,
      satisfied_via_stipulation: 0,
      satisfied_via_structural: 0,
      contested: 0,
      open: 0,
    },
    open_gates: open_gates.length > 0 ? open_gates : undefined,
  };
}

function incompleteResult(
  frame: FrameVersion,
  validation_results: ReadonlyArray<ValidationResult>,
  computed_at: string,
): ComputeResult {
  return {
    validation_results,
    foreclosed_set: new Set<NodeRef>(),
    reachable_set: new Set<NodeRef>(),
    active_set: new Set<NodeRef>(),
    status_map: new Map<NodeRef, NodeStatus>(),
    active_path: [],
    output: incompleteOutput(frame, validation_results, computed_at),
    open_gates:
      validation_results
        .filter((r) => r.severity === "error")
        .map((r) => ({
          node_id: r.node_id ?? r.rule_id,
          reason: "structural" as const,
          prompt: r.message,
        })) ?? [],
  };
}

function buildSyntheticSession(
  input: ComputeInput,
  status_map_obj: { [k: string]: NodeStatus },
): ArgumentSession {
  return {
    id: "runtime-synthetic",
    frame_id: input.frame_version_snapshot.frame_id,
    frame_version_id: input.frame_version_snapshot.id,
    frame_version_snapshot: input.frame_version_snapshot,
    title: "",
    premises: [...input.premises],
    argument_edges: [...input.argument_edges],
    session_authorities: [...input.session_authorities],
    checkpoint_responses: [...input.checkpoint_responses],
    interpretation_selections: [...input.interpretation_selections],
    status_map: status_map_obj,
    created_at: input.computed_at,
    updated_at: input.computed_at,
    current_version_id: "runtime-synthetic",
  };
}

function statusMapToObject(m: ReadonlyMap<NodeRef, NodeStatus>): { [k: string]: NodeStatus } {
  const out: { [k: string]: NodeStatus } = {};
  // Symbol.iterator default yields [k, v] pairs; we collect, sort, and write.
  const entries: Array<[NodeRef, NodeStatus]> = [];
  for (const pair of m) entries.push(pair);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [k, v] of entries) {
    if (v) out[k] = v;
  }
  return out;
}

function compute_internal(input: ComputeInput): ComputeResult {
  const frame = input.frame_version_snapshot;
  const { computed_at } = input;

  // Phase 1 — Validate.
  const synthetic0 = buildSyntheticSession(input, {});
  let validation_results: ValidationResult[];
  try {
    validation_results = [...runValidation(frame, synthetic0)];
  } catch (e) {
    return incompleteResult(
      frame,
      [
        {
          rule_id: "RUNTIME-INTERNAL",
          severity: "error",
          message: `Validation failed unexpectedly: ${(e as Error).message}`,
        },
      ],
      computed_at,
    );
  }
  if (validation_results.some((r) => r.severity === "error")) {
    return incompleteResult(frame, validation_results, computed_at);
  }

  // Build the graph projection. Defensive structural error → incomplete.
  let graph;
  try {
    graph = buildGraph(frame);
  } catch (e) {
    if (e instanceof RuntimeStructuralError) {
      const ruleId =
        e.kind === "cycle"
          ? "V-FR-6"
          : e.kind === "no_root" || e.kind === "multiple_roots"
            ? "V-FR-1"
            : "RUNTIME-STRUCTURAL";
      const synthetic: ValidationResult = {
        rule_id: ruleId,
        severity: "error",
        message: e.message,
      };
      return incompleteResult(frame, [...validation_results, synthetic], computed_at);
    }
    throw e;
  }

  // Phase 2 — Foreclosure.
  const foreclosed = resolveForeclosure(frame, synthetic0, graph);

  // Phase 3 — Reachable and active. Active is computed first against an empty
  // status_map (gates with unresolved inputs do not route on the first pass).
  const reachable = computeReachableSet(frame, graph, foreclosed);
  const active_pass1 = computeActiveSet(frame, synthetic0, graph, foreclosed);

  // Phase 4 — Status. Walks reverse-topologically; threads computed_at.
  const status_map = computeStatusMap(
    frame,
    synthetic0,
    graph,
    foreclosed,
    active_pass1,
    computed_at,
    input.jurisdiction_default,
  );

  // Phase 3 redux — recompute active with the populated status_map so gate
  // routing in output generation sees correct gate results.
  const synthetic1 = buildSyntheticSession(input, statusMapToObject(status_map));
  const active = computeActiveSet(frame, synthetic1, graph, foreclosed);

  // Phase 5 — Output.
  const { active_path, output, open_gates } = generateOutput(
    frame,
    synthetic1,
    graph,
    foreclosed,
    active,
    status_map,
    validation_results,
    computed_at,
  );

  return {
    validation_results,
    foreclosed_set: foreclosed,
    reachable_set: reachable,
    active_set: active,
    status_map,
    active_path,
    output,
    open_gates,
  };
}

export function compute(input: ComputeInput): ComputeResult;
export function compute(
  frame_version: FrameVersion,
  session: ArgumentSession,
  computed_at?: string,
  jurisdiction_default?: Jurisdiction,
): ComputeResult;
export function compute(
  inputOrFrame: ComputeInput | FrameVersion,
  maybeSession?: ArgumentSession,
  computed_at?: string,
  jurisdiction_default?: Jurisdiction,
): ComputeResult {
  if (maybeSession) {
    const frame = inputOrFrame as FrameVersion;
    const session = maybeSession;
    const ts = computed_at ?? session.updated_at ?? "1970-01-01T00:00:00.000Z";
    const input: ComputeInput = {
      frame_version_snapshot: frame,
      checkpoint_responses: session.checkpoint_responses,
      interpretation_selections: session.interpretation_selections,
      premises: session.premises,
      argument_edges: session.argument_edges,
      session_authorities: session.session_authorities ?? [],
      computed_at: ts,
    };
    if (jurisdiction_default) input.jurisdiction_default = jurisdiction_default;
    return compute_internal(input);
  }
  return compute_internal(inputOrFrame as ComputeInput);
}
