import { describe, it, expect } from "vitest";
import { buildDefaultResolutions } from "@/ui/session-migration/use-preview-migration";
import type { OrphanCandidate } from "@/state";

describe("buildDefaultResolutions", () => {
  it("seeds resolution from suggested_kind for each candidate", () => {
    const candidates: OrphanCandidate[] = [
      { carrier_kind: "argument_edge", carrier_id: "a", display_summary: "a", suggested_kind: "discard" },
      {
        carrier_kind: "argument_edge",
        carrier_id: "b",
        display_summary: "b",
        suggested_kind: "reattach",
        reattach_candidates: [
          { target_node_id: "t1", label: "T1" },
          { target_node_id: "t2", label: "T2" },
        ],
      },
      { carrier_kind: "premise", carrier_id: "c", display_summary: "c", suggested_kind: "no_op" },
    ];
    const out = buildDefaultResolutions(candidates);
    expect(out.get("a")).toEqual({ kind: "discard" });
    expect(out.get("b")).toEqual({ kind: "reattach", target_node_id: "t1" });
    expect(out.get("c")).toEqual({ kind: "no_op" });
  });

  it("reattach with no reattach_candidates leaves target_node_id undefined", () => {
    const out = buildDefaultResolutions([
      { carrier_kind: "premise", carrier_id: "x", display_summary: "x", suggested_kind: "reattach" },
    ]);
    expect(out.get("x")).toEqual({ kind: "reattach", target_node_id: undefined });
  });

  it("preserves iteration order over the input array", () => {
    const out = buildDefaultResolutions([
      { carrier_kind: "argument_edge", carrier_id: "z", display_summary: "z", suggested_kind: "discard" },
      { carrier_kind: "argument_edge", carrier_id: "a", display_summary: "a", suggested_kind: "discard" },
    ]);
    expect([...out.keys()]).toEqual(["z", "a"]);
  });
});
