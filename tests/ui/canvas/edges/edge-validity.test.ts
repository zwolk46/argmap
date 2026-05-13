import { describe, it, expect } from "vitest";
import { validEdgeTypesFor, candidateLabel } from "@/ui/canvas/edges/edge-validity";
import type { FrameVersion, Node } from "@/schema";

function makeFrame(...nodePairs: Array<[string, string]>): FrameVersion {
  return {
    id: "v-1",
    frame_id: "f-1",
    version_number: 1,
    nodes: nodePairs.map(([id, type]) => ({ id, type })) as unknown as Node[],
    edges: [],
    created_at: "2026-01-01T00:00:00Z",
    is_milestone: false,
  };
}

describe("validEdgeTypesFor — structural pairs", () => {
  it("RootQuestion → SubQuestion returns at least one candidate", () => {
    const fv = makeFrame(["n-src", "RootQuestion"], ["n-tgt", "SubQuestion"]);
    expect(validEdgeTypesFor("n-src", "n-tgt", fv).length).toBeGreaterThan(0);
  });

  it("RootQuestion → Term returns at least one candidate", () => {
    const fv = makeFrame(["n-src", "RootQuestion"], ["n-tgt", "Term"]);
    expect(validEdgeTypesFor("n-src", "n-tgt", fv).length).toBeGreaterThan(0);
  });

  it("Interpretation → Conclusion returns at least one candidate", () => {
    const fv = makeFrame(["n-src", "Interpretation"], ["n-tgt", "Conclusion"]);
    expect(validEdgeTypesFor("n-src", "n-tgt", fv).length).toBeGreaterThan(0);
  });

  it("Authority → Interpretation returns at least one candidate", () => {
    const fv = makeFrame(["n-src", "Authority"], ["n-tgt", "Interpretation"]);
    expect(validEdgeTypesFor("n-src", "n-tgt", fv).length).toBeGreaterThan(0);
  });
});

describe("validEdgeTypesFor — invalid pairs", () => {
  it("same source and target returns empty", () => {
    const fv = makeFrame(["n-same", "RootQuestion"]);
    expect(validEdgeTypesFor("n-same", "n-same", fv)).toHaveLength(0);
  });

  it("non-existent nodes return empty", () => {
    const fv = makeFrame(["n-src", "RootQuestion"]);
    expect(validEdgeTypesFor("n-src", "n-nonexistent", fv)).toHaveLength(0);
  });

  it("Premise → Premise returns empty", () => {
    const fv = makeFrame(["n-p1", "Premise"], ["n-p2", "Premise"]);
    expect(validEdgeTypesFor("n-p1", "n-p2", fv)).toHaveLength(0);
  });
});

describe("candidateLabel", () => {
  it("returns a non-empty string for every candidate", () => {
    const fv = makeFrame(["n-src", "RootQuestion"], ["n-tgt", "SubQuestion"]);
    const candidates = validEdgeTypesFor("n-src", "n-tgt", fv);
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(candidateLabel(c)).toBeTruthy();
    }
  });
});
