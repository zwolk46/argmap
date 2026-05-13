import { describe, it, expect } from "vitest";
import { buildDefaultResolutions } from "@/ui/session-migration/use-preview-migration";
import type { OrphanCandidate } from "@/state";

describe("buildDefaultResolutions", () => {
  it("seeds resolution from suggested_kind for each candidate AND carries source_node_id (P0-6)", () => {
    const candidates: OrphanCandidate[] = [
      {
        carrier_kind: "argument_edge",
        carrier_id: "edge-a",
        source_node_id: "node-x",
        display_summary: "a",
        suggested_kind: "discard",
      },
      {
        carrier_kind: "argument_edge",
        carrier_id: "edge-b",
        source_node_id: "node-y",
        display_summary: "b",
        suggested_kind: "reattach",
        reattach_candidates: [
          { target_node_id: "t1", label: "T1" },
          { target_node_id: "t2", label: "T2" },
        ],
      },
      {
        carrier_kind: "premise",
        carrier_id: "pr-c",
        source_node_id: "pr-c",
        display_summary: "c",
        suggested_kind: "no_op",
      },
    ];
    const out = buildDefaultResolutions(candidates);
    // Every resolution must carry source_node_id so the repository can apply it.
    expect(out.get("edge-a")).toEqual({ kind: "discard", source_node_id: "node-x" });
    expect(out.get("edge-b")).toEqual({
      kind: "reattach",
      source_node_id: "node-y",
      target_node_id: "t1",
    });
    expect(out.get("pr-c")).toEqual({ kind: "no_op", source_node_id: "pr-c" });
  });

  it("reattach with no reattach_candidates leaves target_node_id undefined but still carries source_node_id", () => {
    const out = buildDefaultResolutions([
      {
        carrier_kind: "premise",
        carrier_id: "x",
        source_node_id: "x",
        display_summary: "x",
        suggested_kind: "reattach",
      },
    ]);
    expect(out.get("x")).toEqual({
      kind: "reattach",
      source_node_id: "x",
      target_node_id: undefined,
    });
  });

  it("preserves iteration order over the input array", () => {
    const out = buildDefaultResolutions([
      {
        carrier_kind: "argument_edge",
        carrier_id: "z",
        source_node_id: "n-z",
        display_summary: "z",
        suggested_kind: "discard",
      },
      {
        carrier_kind: "argument_edge",
        carrier_id: "a",
        source_node_id: "n-a",
        display_summary: "a",
        suggested_kind: "discard",
      },
    ]);
    expect([...out.keys()]).toEqual(["z", "a"]);
  });
});
