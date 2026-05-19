import { describe, it, expect } from "vitest";
import type { Conclusion, Frame, FrameVersion, Node } from "@/schema";
import { validateFrameVersionAgainstFrame } from "@/schema";

const T = "2026-05-01T12:00:00.000Z";

function makeConclusion(position_id: string): Conclusion {
  return {
    id: "n-concl",
    type: "Conclusion",
    layer: "frame",
    statement: "Position holds.",
    direction: { kind: "general", position_id },
    created_at: T,
    updated_at: T,
  };
}

function makeFrameVersion(nodes: Node[]): FrameVersion {
  return {
    id: "fv-1",
    frame_id: "f-1",
    version_number: 1,
    is_milestone: false,
    nodes,
    edges: [],
    created_at: T,
  };
}

function makeFrame(positions: { id: string; label: string }[], mode: "legal" | "general"): Frame {
  return {
    id: "f-1",
    title: "F",
    mode,
    flavor: mode === "general" ? "academic" : undefined,
    positions,
    default_satisfaction_policies: {},
    tags: [],
    pinned: false,
    created_at: T,
    updated_at: T,
    current_version_id: "fv-1",
  };
}

describe("schema/validateFrameVersionAgainstFrame — §15 F-11", () => {
  it("emits V-FR-10 when a Conclusion references a position_id not in Frame.positions", () => {
    const frame = makeFrame([{ id: "p-2", label: "B" }], "general");
    const version = makeFrameVersion([makeConclusion("p-1")]);
    const results = validateFrameVersionAgainstFrame(frame, version);
    expect(results).toHaveLength(1);
    expect(results[0].rule_id).toBe("V-FR-10");
    expect(results[0].severity).toBe("error");
    expect(results[0].node_id).toBe("n-concl");
    expect(results[0].message).toContain("p-1");
  });

  it("passes when every Conclusion position_id resolves on the Frame", () => {
    const frame = makeFrame(
      [
        { id: "p-1", label: "A" },
        { id: "p-2", label: "B" },
      ],
      "general",
    );
    const version = makeFrameVersion([makeConclusion("p-1")]);
    expect(validateFrameVersionAgainstFrame(frame, version)).toEqual([]);
  });

  it("does not duplicate V-FR-10 for an empty position_id (left to the local rule)", () => {
    const frame = makeFrame([{ id: "p-1", label: "A" }], "general");
    const version = makeFrameVersion([makeConclusion("")]);
    expect(validateFrameVersionAgainstFrame(frame, version)).toEqual([]);
  });

  it("is a no-op in legal mode", () => {
    const frame = makeFrame([], "legal");
    const legalConclusion: Conclusion = {
      ...makeConclusion("p-1"),
      direction: { kind: "legal", value: "favors_plaintiff" },
    };
    const version = makeFrameVersion([legalConclusion]);
    expect(validateFrameVersionAgainstFrame(frame, version)).toEqual([]);
  });

  it("treats a missing Frame.positions as no resolutions (every non-empty id is unknown)", () => {
    const frame = makeFrame([], "general");
    delete (frame as Partial<Frame>).positions;
    const version = makeFrameVersion([makeConclusion("p-1")]);
    const results = validateFrameVersionAgainstFrame(frame, version);
    expect(results).toHaveLength(1);
    expect(results[0].rule_id).toBe("V-FR-10");
  });

  it("sorts results by node_id for determinism (Article II § 2)", () => {
    const frame = makeFrame([], "general");
    const c1: Conclusion = { ...makeConclusion("p-x"), id: "n-z-concl" };
    const c2: Conclusion = { ...makeConclusion("p-y"), id: "n-a-concl" };
    const version = makeFrameVersion([c1, c2]);
    const results = validateFrameVersionAgainstFrame(frame, version);
    expect(results.map((r) => r.node_id)).toEqual(["n-a-concl", "n-z-concl"]);
  });
});
