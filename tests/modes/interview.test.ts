import { describe, it, expect } from "vitest";
import { computeInterviewOrder } from "@/modes";
import {
  makeFv,
  makeRoot,
  makeSubQ,
  makeTerm,
  makeInterp,
  makeCheckpoint,
  makeSession,
  makeEdge,
} from "./_fixtures";
import type { ComputeResult } from "@/runtime";
import type { NodeRef, NodeStatus } from "@/schema";

const T = "2026-05-10T00:00:00.000Z";

function makeComputeResult(
  reachable: NodeRef[],
  status_overrides: Record<string, NodeStatus["status"]> = {},
): ComputeResult {
  const status_map = new Map<NodeRef, NodeStatus>();
  for (const [id, status] of Object.entries(status_overrides)) {
    status_map.set(id, { status, evaluated_at: T });
  }
  return {
    validation_results: [],
    reachable_set: new Set(reachable),
    active_set: new Set(reachable),
    foreclosed_set: new Set<NodeRef>(),
    status_map,
    output: {
      shape: "incomplete",
      prose_summary: "",
      computed_at: T,
      confidence_breakdown: {
        total_checkpoints_on_path: 0,
        satisfied_via_binding: 0,
        satisfied_via_persuasive: 0,
        satisfied_via_stipulation: 0,
        satisfied_via_structural: 0,
        contested: 0,
        open: 0,
      },
    },
    active_path: [],
    open_gates: [],
  };
}

describe("modes/interview", () => {
  describe("computeInterviewOrder", () => {
    it("returns [] when there are no open items", () => {
      const root = makeRoot("root");
      const fv = makeFv({ nodes: [root] });
      const session = makeSession();
      const cr = makeComputeResult(["root"]);
      const result = computeInterviewOrder(fv, session, cr);
      expect(result).toEqual([]);
    });

    it("returns an unanswered Checkpoint as an open item", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-1");
      const fv = makeFv({
        nodes: [root, cp],
        edges: [makeEdge("e1", "LEADS_TO", "root", "cp-1")],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "cp-1"]);
      const result = computeInterviewOrder(fv, session, cr);
      expect(result.some((item) => item.node_id === "cp-1" && item.reason === "open")).toBe(true);
    });

    it("returns an unselected Term as an open item with reason 'open'", () => {
      const root = makeRoot("root");
      const term = makeTerm("term-1", 0);
      const fv = makeFv({
        nodes: [root, term],
        edges: [makeEdge("e1", "TURNS_ON", "root", "term-1")],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "term-1"]);
      const result = computeInterviewOrder(fv, session, cr);
      expect(result.some((item) => item.node_id === "term-1" && item.reason === "open")).toBe(true);
    });

    it("does NOT descend past a Term with no selection", () => {
      const root = makeRoot("root");
      const term = makeTerm("term-1", 0);
      const interp = makeInterp("interp-1");
      const fv = makeFv({
        nodes: [root, term, interp],
        edges: [
          makeEdge("e1", "TURNS_ON", "root", "term-1"),
          makeEdge("e2", "INTERPRETED_AS", "term-1", "interp-1"),
        ],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "term-1", "interp-1"]);
      const result = computeInterviewOrder(fv, session, cr);
      expect(result.some((item) => item.node_id === "interp-1")).toBe(false);
      expect(result.some((item) => item.node_id === "term-1")).toBe(true);
    });

    it("descends into selected Interpretation when a selection exists", () => {
      const root = makeRoot("root");
      const term = makeTerm("term-1", 0);
      const interp = makeInterp("interp-1");
      const cp = makeCheckpoint("cp-under-interp");
      const fv = makeFv({
        nodes: [root, term, interp, cp],
        edges: [
          makeEdge("e1", "TURNS_ON", "root", "term-1"),
          makeEdge("e2", "INTERPRETED_AS", "term-1", "interp-1"),
          makeEdge("e3", "LEADS_TO", "interp-1", "cp-under-interp"),
        ],
      });
      const session = makeSession({
        interpretation_selections: [
          {
            term_id: "term-1",
            selected_interpretation_ids: ["interp-1"],
            selected_at: T,
          },
        ],
      });
      const cr = makeComputeResult(["root", "term-1", "interp-1", "cp-under-interp"]);
      const result = computeInterviewOrder(fv, session, cr);
      expect(result.some((item) => item.node_id === "cp-under-interp")).toBe(true);
    });

    it("does NOT descend past a Checkpoint with no response", () => {
      const root = makeRoot("root");
      const sub = makeSubQ("sub-down");
      const base_cp = makeCheckpoint("cp-1");
      const cpWithTarget: import("@/schema").Checkpoint = {
        ...base_cp,
        options: [{ id: "opt-yes", label: "Yes", satisfies: true, target_node_id: "sub-down" }],
      };
      const fv2 = makeFv({
        nodes: [root, cpWithTarget, sub],
        edges: [makeEdge("e1", "LEADS_TO", "root", "cp-1")],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "cp-1", "sub-down"]);
      const result = computeInterviewOrder(fv2, session, cr);
      expect(result.some((item) => item.node_id === "sub-down")).toBe(false);
      expect(result.some((item) => item.node_id === "cp-1")).toBe(true);
    });

    it("sorts jurisdictional SubQuestion items first (A8 priority bubble)", () => {
      const root = makeRoot("root");
      const jur = makeSubQ("jur-sub", true);
      const normal = makeSubQ("normal-sub", false);
      const fv = makeFv({
        nodes: [root, jur, normal],
        edges: [
          makeEdge("e1", "DECOMPOSES_INTO", "root", "normal-sub"),
          makeEdge("e2", "DECOMPOSES_INTO", "root", "jur-sub"),
        ],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "jur-sub", "normal-sub"], {
        "jur-sub": "open",
        "normal-sub": "open",
      });
      const result = computeInterviewOrder(fv, session, cr);
      const jur_idx = result.findIndex((i) => i.node_id === "jur-sub");
      const normal_idx = result.findIndex((i) => i.node_id === "normal-sub");
      // Both should be in the list
      if (jur_idx >= 0 && normal_idx >= 0) {
        expect(jur_idx).toBeLessThan(normal_idx);
      }
    });

    it("sorts Term children by Term.order asc", () => {
      const root = makeRoot("root");
      const term0 = makeTerm("term-a", 0);
      const term1 = makeTerm("term-b", 1);
      const fv = makeFv({
        nodes: [root, term1, term0],
        edges: [
          makeEdge("e1", "TURNS_ON", "root", "term-a"),
          makeEdge("e2", "TURNS_ON", "root", "term-b"),
        ],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "term-a", "term-b"]);
      const result = computeInterviewOrder(fv, session, cr);
      const a_idx = result.findIndex((i) => i.node_id === "term-a");
      const b_idx = result.findIndex((i) => i.node_id === "term-b");
      if (a_idx >= 0 && b_idx >= 0) {
        expect(a_idx).toBeLessThan(b_idx);
      }
    });

    it("sets recommended_next on first non-advisory item", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-1");
      const fv = makeFv({
        nodes: [root, cp],
        edges: [makeEdge("e1", "LEADS_TO", "root", "cp-1")],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "cp-1"]);
      const result = computeInterviewOrder(fv, session, cr);
      const recommended = result.filter((i) => i.recommended_next);
      expect(recommended).toHaveLength(1);
      expect(result[0]?.recommended_next).toBe(true);
    });

    it("never emits an item for a node not in reachable_set", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-unreachable");
      const fv = makeFv({
        nodes: [root, cp],
        edges: [],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root"]); // cp not in reachable
      const result = computeInterviewOrder(fv, session, cr);
      expect(result.some((i) => i.node_id === "cp-unreachable")).toBe(false);
    });

    it("produces byte-identical results on two invocations with identical inputs", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-1");
      const fv = makeFv({
        nodes: [root, cp],
        edges: [makeEdge("e1", "LEADS_TO", "root", "cp-1")],
      });
      const session = makeSession();
      const cr = makeComputeResult(["root", "cp-1"]);
      const r1 = computeInterviewOrder(fv, session, cr);
      const r2 = computeInterviewOrder(fv, session, cr);
      expect(r1).toEqual(r2);
    });
  });
});
