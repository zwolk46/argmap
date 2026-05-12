// Phase 4 of the compute pipeline (Stream C3).
//
// Walks the frame in reverse topological order and assigns a NodeStatus to
// every non-source node (Premise and Authority are sources and receive no
// status). Precedence ladder: foreclosed > not_applicable > contested > open
// > satisfied — implemented by the order of the per-node check sequence
// (foreclosure → active → gate/contested → policy), not by post-hoc compare.

import type {
  FrameVersion,
  ArgumentSession,
  NodeRef,
  Node,
  NodeStatus,
  Checkpoint,
  CheckpointOption,
  Jurisdiction,
} from "@/schema";
import { resolveEffectivePolicy, isCheckpoint, isLogicalGate } from "@/schema";
import { sortedBy } from "./iteration-helpers";
import { topologicalSort, type Graph } from "./graph";
import { foreclosureScopeFor } from "./foreclosure";
import { evaluateGate, GATE_NOT_SATISFIED_MARKER } from "./gates";
import { evaluatePolicy } from "./conditions";

export { GATE_NOT_SATISFIED_MARKER };

function contestedReason(
  checkpoint: Checkpoint,
  session: ArgumentSession,
): { contested: true; reason: "contradicting_premises" } | undefined {
  // (a) At least one ANSWERS edge into this checkpoint AND
  // (b) at least one CONTRADICTS edge from a Premise to this checkpoint,
  //     OR the chosen option's routes_to_status === "contested".
  let hasAnswer = false;
  let hasContradict = false;
  let response: { selected_option_id: string } | undefined;
  for (const e of sortedBy(session.argument_edges, (x) => x.id)) {
    if (e.target !== checkpoint.id) continue;
    if (e.type === "ANSWERS") hasAnswer = true;
    if (e.type === "CONTRADICTS") hasContradict = true;
  }
  for (const r of session.checkpoint_responses) {
    if (r.checkpoint_id === checkpoint.id) {
      response = r;
      break;
    }
  }
  if (!hasAnswer) return undefined;
  if (hasContradict) return { contested: true, reason: "contradicting_premises" };
  if (response) {
    const opt: CheckpointOption | undefined = checkpoint.options.find(
      (o) => o.id === response!.selected_option_id,
    );
    if (opt && opt.routes_to_status === "contested") {
      return { contested: true, reason: "contradicting_premises" };
    }
  }
  return undefined;
}

export function computeStatusMap(
  frame: FrameVersion,
  session: ArgumentSession,
  graph: Graph,
  foreclosed: ReadonlySet<NodeRef>,
  active: ReadonlySet<NodeRef>,
  computed_at: string,
  jurisdiction_default?: Jurisdiction,
): ReadonlyMap<NodeRef, NodeStatus> {
  const order = topologicalSort(graph);
  const reversed = [...order].reverse();
  const out = new Map<NodeRef, NodeStatus>();

  for (const nid of reversed) {
    const node: Node = graph.nodeById(nid);

    // Premise / Authority: no status assignment (map omits them).
    if (node.type === "Premise" || node.type === "Authority") continue;

    // 1) Foreclosure check.
    if (foreclosed.has(nid)) {
      const scope = foreclosureScopeFor(nid, frame, session);
      if (scope === "decided") {
        out.set(nid, {
          status: "satisfied",
          via: ["structural_resolution"],
          evaluated_at: computed_at,
        });
      } else {
        out.set(nid, {
          status: "foreclosed",
          evaluated_at: computed_at,
        });
      }
      continue;
    }

    // 2) Active-set check.
    if (!active.has(nid)) {
      out.set(nid, {
        status: "not_applicable",
        evaluated_at: computed_at,
      });
      continue;
    }

    // 3) LogicalGate evaluation.
    if (isLogicalGate(node)) {
      const result = evaluateGate(node, out);
      if (result === "satisfied") {
        out.set(nid, { status: "satisfied", evaluated_at: computed_at });
      } else if (result === "not_satisfied") {
        out.set(nid, {
          status: "open",
          failed_conditions: [GATE_NOT_SATISFIED_MARKER],
          evaluated_at: computed_at,
        });
      } else {
        out.set(nid, {
          status: "open",
          failed_conditions: ["inputs_indeterminate"],
          evaluated_at: computed_at,
        });
      }
      continue;
    }

    // 4) Contested heuristic for Checkpoint.
    if (isCheckpoint(node)) {
      const cr = contestedReason(node, session);
      if (cr) {
        out.set(nid, {
          status: "contested",
          failed_conditions: [cr.reason],
          evaluated_at: computed_at,
        });
        continue;
      }
    }

    // 5) Policy evaluation. FrameVersion does not carry frame_default; fall
    // through to library defaults. Downstream sessions holding Frame may
    // override by passing per-instance options_box through resolution.
    const policy = resolveEffectivePolicy(
      node.type as Parameters<typeof resolveEffectivePolicy>[0],
      "options_box" in node ? node.options_box : undefined,
      undefined,
    );
    const r = evaluatePolicy(policy, node, frame, session, out, jurisdiction_default);
    if (r.passed) {
      const status: NodeStatus = {
        status: "satisfied",
        evaluated_at: computed_at,
      };
      if (r.via.length > 0) {
        status.via = [...r.via] as NodeStatus["via"];
      }
      out.set(nid, status);
    } else {
      out.set(nid, {
        status: "open",
        failed_conditions: [...r.failed],
        evaluated_at: computed_at,
      });
    }
  }

  return out;
}
