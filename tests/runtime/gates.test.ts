import { describe, it, expect } from "vitest";
import { evaluateGate, booleanizeStatus, GATE_NOT_SATISFIED_MARKER } from "@/runtime/gates";
import type {
  AndGate,
  OrGate,
  NotGate,
  IfThenGate,
  UnlessGate,
  NodeRef,
  NodeStatus,
} from "@/schema";

const T = "2026-05-10T00:00:00.000Z";

function satisfied(): NodeStatus {
  return { status: "satisfied", evaluated_at: T };
}
function open(): NodeStatus {
  return { status: "open", failed_conditions: ["something_unmet"], evaluated_at: T };
}
function gateNotSat(): NodeStatus {
  return { status: "open", failed_conditions: [GATE_NOT_SATISFIED_MARKER], evaluated_at: T };
}
function contested(): NodeStatus {
  return { status: "contested", failed_conditions: ["contradicting_premises"], evaluated_at: T };
}
function foreclosedMoot(): NodeStatus {
  return { status: "foreclosed", evaluated_at: T };
}

function mapOf(...pairs: Array<[NodeRef, NodeStatus]>): ReadonlyMap<NodeRef, NodeStatus> {
  const m = new Map<NodeRef, NodeStatus>();
  for (const [k, v] of pairs) m.set(k, v);
  return m;
}

const baseNode = {
  id: "g",
  created_at: T,
  updated_at: T,
  type: "LogicalGate" as const,
  layer: "frame" as const,
};

describe("evaluateGate — AndGate", () => {
  const g: AndGate = { ...baseNode, gate_type: "AND", inputs: ["n1", "n2"] };
  it("all satisfied → satisfied", () => {
    const sm = mapOf(["n1", satisfied()], ["n2", satisfied()]);
    expect(evaluateGate(g, sm)).toBe("satisfied");
  });
  it("one open (indeterminate) → indeterminate", () => {
    const sm = mapOf(["n1", satisfied()], ["n2", open()]);
    expect(evaluateGate(g, sm)).toBe("indeterminate");
  });
  it("one gate-not-sat marker → not_satisfied (propagation)", () => {
    const sm = mapOf(["n1", satisfied()], ["n2", gateNotSat()]);
    expect(evaluateGate(g, sm)).toBe("not_satisfied");
  });
  it("missing input → indeterminate", () => {
    const sm = mapOf(["n1", satisfied()]);
    expect(evaluateGate(g, sm)).toBe("indeterminate");
  });
});

describe("evaluateGate — OrGate", () => {
  const g: OrGate = { ...baseNode, gate_type: "OR", inputs: ["n1", "n2"] };
  it("any satisfied → satisfied", () => {
    const sm = mapOf(["n1", open()], ["n2", satisfied()]);
    expect(evaluateGate(g, sm)).toBe("satisfied");
  });
  it("all gate-not-sat markers → not_satisfied", () => {
    const sm = mapOf(["n1", gateNotSat()], ["n2", gateNotSat()]);
    expect(evaluateGate(g, sm)).toBe("not_satisfied");
  });
  it("mix of open and gate-not-sat (no satisfied) → indeterminate", () => {
    const sm = mapOf(["n1", open()], ["n2", gateNotSat()]);
    expect(evaluateGate(g, sm)).toBe("indeterminate");
  });
});

describe("evaluateGate — NotGate", () => {
  const g: NotGate = { ...baseNode, gate_type: "NOT", input: "n1" };
  it("input satisfied → not_satisfied", () => {
    expect(evaluateGate(g, mapOf(["n1", satisfied()]))).toBe("not_satisfied");
  });
  it("input gate-not-sat → satisfied", () => {
    expect(evaluateGate(g, mapOf(["n1", gateNotSat()]))).toBe("satisfied");
  });
  it("input open (indeterminate) → indeterminate", () => {
    expect(evaluateGate(g, mapOf(["n1", open()]))).toBe("indeterminate");
  });
  it("input missing → indeterminate", () => {
    expect(evaluateGate(g, mapOf())).toBe("indeterminate");
  });
});

describe("evaluateGate — IfThenGate", () => {
  const g: IfThenGate = { ...baseNode, gate_type: "IF_THEN", antecedent: "a", consequent: "c" };
  it("antecedent satisfied, consequent satisfied → satisfied", () => {
    expect(evaluateGate(g, mapOf(["a", satisfied()], ["c", satisfied()]))).toBe("satisfied");
  });
  it("antecedent satisfied, consequent gate-not-sat → not_satisfied", () => {
    expect(evaluateGate(g, mapOf(["a", satisfied()], ["c", gateNotSat()]))).toBe("not_satisfied");
  });
  it("antecedent satisfied, consequent indeterminate → indeterminate", () => {
    expect(evaluateGate(g, mapOf(["a", satisfied()], ["c", open()]))).toBe("indeterminate");
  });
  it("antecedent gate-not-sat → satisfied (vacuous)", () => {
    expect(evaluateGate(g, mapOf(["a", gateNotSat()]))).toBe("satisfied");
  });
  it("antecedent open → indeterminate", () => {
    expect(evaluateGate(g, mapOf(["a", open()]))).toBe("indeterminate");
  });
});

describe("evaluateGate — UnlessGate", () => {
  const g: UnlessGate = { ...baseNode, gate_type: "UNLESS", main: "m", exception: "x" };
  it("main satisfied, exception gate-not-sat → satisfied", () => {
    expect(evaluateGate(g, mapOf(["m", satisfied()], ["x", gateNotSat()]))).toBe("satisfied");
  });
  it("main satisfied, exception satisfied → not_satisfied", () => {
    expect(evaluateGate(g, mapOf(["m", satisfied()], ["x", satisfied()]))).toBe("not_satisfied");
  });
  it("main satisfied, exception indeterminate → indeterminate", () => {
    expect(evaluateGate(g, mapOf(["m", satisfied()], ["x", open()]))).toBe("indeterminate");
  });
  it("main gate-not-sat → not_satisfied", () => {
    expect(evaluateGate(g, mapOf(["m", gateNotSat()]))).toBe("not_satisfied");
  });
  it("main open → indeterminate", () => {
    expect(evaluateGate(g, mapOf(["m", open()]))).toBe("indeterminate");
  });
});

describe("booleanizeStatus", () => {
  it.each([
    [satisfied(), "satisfied"],
    [open(), "indeterminate"],
    [contested(), "indeterminate"],
    [foreclosedMoot(), "indeterminate"],
    [undefined, "indeterminate"],
  ] as const)("maps %s → %s", (input, expected) => {
    expect(booleanizeStatus(input)).toBe(expected);
  });
});
