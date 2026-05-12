// Cross-cutting LogicalGate evaluation. Pure.
//
// Honors the schema's named-slot encoding: AndGate / OrGate use `inputs`;
// NotGate uses `input`; IfThenGate uses `antecedent` + `consequent`; UnlessGate
// uses `main` + `exception`. The "gate evaluated not_satisfied" signal flows
// through NodeStatus.failed_conditions[] via GATE_NOT_SATISFIED_MARKER so
// downstream gates that NOT / IF_THEN / UNLESS can see it.

import type {
  LogicalGate,
  AndGate,
  OrGate,
  NotGate,
  IfThenGate,
  UnlessGate,
  NodeRef,
  NodeStatus,
} from "@/schema";
import { isAndGate, isOrGate, isNotGate, isIfThenGate, isUnlessGate } from "@/schema";
import { sortedBy } from "./iteration-helpers";

export type GateResult = "satisfied" | "not_satisfied" | "indeterminate";

export const GATE_NOT_SATISFIED_MARKER = "gate_evaluated_not_satisfied";

function isMarkedNotSatisfied(status: NodeStatus | undefined): boolean {
  if (!status) return false;
  if (status.status !== "open") return false;
  return (status.failed_conditions ?? []).includes(GATE_NOT_SATISFIED_MARKER);
}

// Booleanize: collapse a NodeStatus to one of two values usable as a gate input.
// "satisfied" maps to "satisfied"; "foreclosed (decided)" via "structural_resolution"
// also maps to "satisfied"; everything else (and `undefined`) maps to "indeterminate".
export function booleanizeStatus(status: NodeStatus | undefined): "satisfied" | "indeterminate" {
  if (!status) return "indeterminate";
  if (status.status === "satisfied") return "satisfied";
  return "indeterminate";
}

function evaluateAnd(g: AndGate, sm: ReadonlyMap<NodeRef, NodeStatus>): GateResult {
  let hasIndeterminate = false;
  for (const inputId of sortedBy(g.inputs, (x) => x)) {
    const raw = sm.get(inputId);
    if (isMarkedNotSatisfied(raw)) return "not_satisfied";
    const b = booleanizeStatus(raw);
    if (b !== "satisfied") hasIndeterminate = true;
  }
  if (hasIndeterminate) return "indeterminate";
  return "satisfied";
}

function evaluateOr(g: OrGate, sm: ReadonlyMap<NodeRef, NodeStatus>): GateResult {
  let anyMarkedNotSatisfied = false;
  let anySatisfied = false;
  let allMarkedNotSatisfied = g.inputs.length > 0;
  for (const inputId of sortedBy(g.inputs, (x) => x)) {
    const raw = sm.get(inputId);
    if (booleanizeStatus(raw) === "satisfied") {
      anySatisfied = true;
      allMarkedNotSatisfied = false;
    } else if (isMarkedNotSatisfied(raw)) {
      anyMarkedNotSatisfied = true;
    } else {
      allMarkedNotSatisfied = false;
    }
  }
  if (anySatisfied) return "satisfied";
  // No satisfied input. If every input is definitively not_satisfied, OR is
  // not_satisfied. Otherwise indeterminate.
  if (allMarkedNotSatisfied && anyMarkedNotSatisfied) return "not_satisfied";
  return "indeterminate";
}

function evaluateNot(g: NotGate, sm: ReadonlyMap<NodeRef, NodeStatus>): GateResult {
  const raw = sm.get(g.input);
  if (!raw) return "indeterminate";
  if (raw.status === "satisfied") return "not_satisfied";
  if (isMarkedNotSatisfied(raw)) return "satisfied";
  return "indeterminate";
}

function evaluateIfThen(g: IfThenGate, sm: ReadonlyMap<NodeRef, NodeStatus>): GateResult {
  const a = sm.get(g.antecedent);
  const c = sm.get(g.consequent);
  if (!a) return "indeterminate";
  if (a.status !== "satisfied") {
    if (isMarkedNotSatisfied(a)) return "satisfied"; // vacuously true
    return "indeterminate";
  }
  if (!c) return "indeterminate";
  if (c.status === "satisfied") return "satisfied";
  if (isMarkedNotSatisfied(c)) return "not_satisfied";
  return "indeterminate";
}

function evaluateUnless(g: UnlessGate, sm: ReadonlyMap<NodeRef, NodeStatus>): GateResult {
  const m = sm.get(g.main);
  const x = sm.get(g.exception);
  if (!m) return "indeterminate";
  if (m.status !== "satisfied") {
    if (isMarkedNotSatisfied(m)) return "not_satisfied";
    return "indeterminate";
  }
  if (!x) return "indeterminate";
  if (isMarkedNotSatisfied(x)) return "satisfied";
  if (x.status === "satisfied") return "not_satisfied";
  return "indeterminate";
}

export function evaluateGate(
  gate: LogicalGate,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): GateResult {
  if (isAndGate(gate)) return evaluateAnd(gate, status_map);
  if (isOrGate(gate)) return evaluateOr(gate, status_map);
  if (isNotGate(gate)) return evaluateNot(gate, status_map);
  if (isIfThenGate(gate)) return evaluateIfThen(gate, status_map);
  if (isUnlessGate(gate)) return evaluateUnless(gate, status_map);
  return "indeterminate";
}

export function gateRoutesTo(
  gate: LogicalGate,
  status_map: ReadonlyMap<NodeRef, NodeStatus>,
): boolean {
  return evaluateGate(gate, status_map) === "satisfied";
}
