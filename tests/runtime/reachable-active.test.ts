import { describe, it, expect } from "vitest";
import { computeReachableSet, computeActiveSet } from "@/runtime/reachable-active";
import { buildGraph } from "@/runtime/graph";
import { buildLegalSimple, T0 } from "./_fixtures";

describe("computeReachableSet / computeActiveSet", () => {
  it("reachable: contains both Interpretations regardless of selection", () => {
    const { frame } = buildLegalSimple();
    const graph = buildGraph(frame.version);
    const reachable = computeReachableSet(frame.version, graph, new Set());
    expect(reachable.has("n-interp-a")).toBe(true);
    expect(reachable.has("n-interp-b")).toBe(true);
  });

  it("active: only selected Interpretation flows", () => {
    const { frame, session } = buildLegalSimple();
    const graph = buildGraph(frame.version);
    const active = computeActiveSet(frame.version, session.session, graph, new Set());
    expect(active.has("n-interp-a")).toBe(true);
    expect(active.has("n-interp-b")).toBe(false);
  });

  it("active set is empty when there is no root", () => {
    const fr = {
      ...buildLegalSimple().frame.version,
      nodes: [],
    };
    const { session } = buildLegalSimple();
    const graph = buildGraph(fr);
    const active = computeActiveSet(fr, session.session, graph, new Set());
    expect(active.size).toBe(0);
  });

  it("active set honors foreclosure", () => {
    const { frame, session } = buildLegalSimple();
    const graph = buildGraph(frame.version);
    const active = computeActiveSet(frame.version, session.session, graph, new Set(["n-concl"]));
    expect(active.has("n-concl")).toBe(false);
  });

  it("reachable set is the structural projection only (excludes CITES annotation edges)", () => {
    const { frame } = buildLegalSimple();
    const graph = buildGraph(frame.version);
    const reachable = computeReachableSet(frame.version, graph, new Set());
    // Authority is reached only via CITES (an annotation edge), so it should
    // NOT be in the reachable set.
    expect(reachable.has("n-auth")).toBe(false);
  });

  void T0;
});
