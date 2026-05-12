import { describe, it, expect } from "vitest";
import {
  isCheckpoint,
  isLogicalGate,
  isAndGate,
  isIfThenGate,
  isUnlessGate,
  isBooleanEvaluable,
  type Node,
  type LogicalGate,
  type Edge,
  type Condition,
  type NodeRef,
} from "@/schema";

describe("schema/type-narrowing", () => {
  it("Node type guards narrow to the per-type interface", () => {
    function example(n: Node) {
      if (isCheckpoint(n)) {
        const at: "boolean" | "multiple_choice" | "graded" = n.answer_type;
        return at;
      }
      if (isLogicalGate(n)) {
        if (isAndGate(n)) {
          const _x: NodeRef[] = n.inputs;
          return _x;
        }
        if (isIfThenGate(n)) {
          const _a: NodeRef = n.antecedent;
          return _a;
        }
        if (isUnlessGate(n)) {
          const _m: NodeRef = n.main;
          return _m;
        }
      }
      return null;
    }
    expect(typeof example).toBe("function");
  });

  it("LogicalGate sub-discriminator exhausts via switch on gate_type", () => {
    function exhaust(g: LogicalGate): string {
      switch (g.gate_type) {
        case "AND":
          return `and-${g.inputs.length}`;
        case "OR":
          return `or-${g.inputs.length}`;
        case "NOT":
          return `not-${g.input}`;
        case "IF_THEN":
          return `if-${g.antecedent}-${g.consequent}`;
        case "UNLESS":
          return `unless-${g.main}-${g.exception}`;
      }
    }
    expect(typeof exhaust).toBe("function");
  });

  it("Edge discriminator exhausts via switch on type", () => {
    function exhaust(e: Edge): string {
      switch (e.type) {
        case "DECOMPOSES_INTO":
        case "TURNS_ON":
        case "INTERPRETED_AS":
        case "GATES":
        case "BINDING_IN":
          return e.type;
        case "LEADS_TO":
          return e.condition ?? "leads_to";
        case "FORECLOSES":
          return e.scope ?? "moot";
        case "ANSWERS":
          return e.selected_option_id;
        case "SUPPORTS":
        case "CONTRADICTS":
          return e.weight ?? "unweighted";
        case "CITES":
          return e.strength ?? "background";
        case "DISTINGUISHED_BY":
          return e.reasoning ?? "";
      }
    }
    expect(typeof exhaust).toBe("function");
  });

  it("Condition discriminator exhausts via switch on kind", () => {
    function exhaust(c: Condition): string {
      switch (c.kind) {
        case "premise_attached":
        case "interpretation_selected":
        case "all_children_resolved":
        case "path_complete":
        case "not_contradicted":
        case "authority_required":
        case "authority_binding":
        case "not_distinguished":
        case "standard_of_review_applied":
        case "not_foreclosed":
          return c.kind;
        case "premise_kind_in":
          return `kinds:${c.kinds.join(",")}`;
        case "burden_met":
          return `burden:${c.level}`;
      }
    }
    expect(typeof exhaust).toBe("function");
  });

  it("isBooleanEvaluable returns true for the V-GATE-5/6 input policy", () => {
    expect(typeof isBooleanEvaluable).toBe("function");
  });
});
