import { describe, it, expect } from "vitest";
import { computeDeletionCascade } from "@/modes";
import { makeFv, makeRoot, makeSubQ, makeEdge, makeAndGate } from "./_fixtures";
import type { FrameVersion } from "@/schema";

describe("modes/cascade", () => {
  it("computes cascade for a simple linear chain: Root→A→B→C, delete A", () => {
    const root = makeRoot("root");
    const a = makeSubQ("a");
    const b = makeSubQ("b");
    const c = makeSubQ("c");
    const fv: FrameVersion = makeFv({
      nodes: [root, a, b, c],
      edges: [
        makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
        makeEdge("e2", "DECOMPOSES_INTO", "a", "b"),
        makeEdge("e3", "DECOMPOSES_INTO", "b", "c"),
      ],
    });
    const report = computeDeletionCascade(fv, "a");
    expect(report.deleted_node_ids).toEqual(["a", "b", "c"]);
    expect(report.deleted_edge_ids.sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("preserves node reachable via second structural path", () => {
    const root = makeRoot("root");
    const a = makeSubQ("a");
    const b = makeSubQ("b");
    const c = makeSubQ("c");
    const fv: FrameVersion = makeFv({
      nodes: [root, a, b, c],
      edges: [
        makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
        makeEdge("e2", "DECOMPOSES_INTO", "root", "b"),
        makeEdge("e3", "DECOMPOSES_INTO", "a", "c"),
        makeEdge("e4", "DECOMPOSES_INTO", "b", "c"),
      ],
    });
    // Delete A: C is still reachable via Root→B→C
    const report = computeDeletionCascade(fv, "a");
    expect(report.deleted_node_ids).toEqual(["a"]);
    expect(report.deleted_edge_ids.sort()).toEqual(["e1", "e3"]);
  });

  it("includes LogicalGate inputs in structural graph", () => {
    const root = makeRoot("root");
    const gate = makeAndGate("gate", ["p", "q"]);
    const p = makeSubQ("p");
    const q = makeSubQ("q");
    const fv: FrameVersion = makeFv({
      nodes: [root, gate, p, q],
      edges: [
        makeEdge("e1", "DECOMPOSES_INTO", "root", "gate"),
        makeEdge("e2", "DECOMPOSES_INTO", "root", "p"),
      ],
    });
    // Delete gate: q has no other parent → cascades; p has root→p edge → survives
    const report = computeDeletionCascade(fv, "gate");
    expect(report.deleted_node_ids).toEqual(["gate", "q"]);
    expect(report.deleted_node_ids).not.toContain("p");
  });

  it("falls back to trivial cascade when RootQuestion absent", () => {
    const a = makeSubQ("a");
    const b = makeSubQ("b");
    const fv: FrameVersion = makeFv({
      nodes: [a, b],
      edges: [makeEdge("e1", "DECOMPOSES_INTO", "a", "b")],
    });
    const report = computeDeletionCascade(fv, "a");
    expect(report.deleted_node_ids).toEqual(["a"]);
    expect(report.deleted_edge_ids).toEqual(["e1"]);
  });

  it("includes target unconditionally even if unreachable from root", () => {
    const root = makeRoot("root");
    const orphan = makeSubQ("orphan");
    const fv: FrameVersion = makeFv({
      nodes: [root, orphan],
      edges: [],
    });
    const report = computeDeletionCascade(fv, "orphan");
    expect(report.deleted_node_ids).toContain("orphan");
  });

  it("is idempotent — two invocations produce identical output", () => {
    const root = makeRoot("root");
    const a = makeSubQ("a");
    const b = makeSubQ("b");
    const fv: FrameVersion = makeFv({
      nodes: [root, a, b],
      edges: [
        makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
        makeEdge("e2", "DECOMPOSES_INTO", "a", "b"),
      ],
    });
    const r1 = computeDeletionCascade(fv, "a");
    const r2 = computeDeletionCascade(fv, "a");
    expect(r1).toEqual(r2);
  });

  it("excludes FORECLOSES edges from structural reachability", () => {
    const root = makeRoot("root");
    const a = makeSubQ("a");
    const b = makeSubQ("b");
    const fv: FrameVersion = makeFv({
      nodes: [root, a, b],
      edges: [
        makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
        makeEdge("e2", "FORECLOSES", "a", "b"),
      ],
    });
    // FORECLOSES is not structural: b is never in R1 (unreachable from root via structural edges).
    // Deleting a: cascade = {a} only. b is not part of the cascade because it was never reachable.
    const report = computeDeletionCascade(fv, "a");
    expect(report.deleted_node_ids).toEqual(["a"]);
    // The FORECLOSES edge e2 is deleted because a (its source) is in the cascade
    expect(report.deleted_edge_ids).toContain("e1");
    expect(report.deleted_edge_ids).toContain("e2");
    expect(report.deleted_node_ids).not.toContain("b");
  });
});
