import { describe, it, expect } from "vitest";
import { countAttachedEdges } from "@/ui/argument-running/bottom-panel/premise-row";
import type { Edge } from "@/schema";

const ts = "2026-05-12T00:00:00.000Z";

function ans(id: string, source: string): Edge {
  return {
    id,
    type: "ANSWERS",
    layer: "argument",
    source,
    target: "x",
    selected_option_id: "o1",
    created_at: ts,
    updated_at: ts,
  };
}

function sup(id: string, source: string): Edge {
  return {
    id,
    type: "SUPPORTS",
    layer: "argument",
    source,
    target: "x",
    created_at: ts,
    updated_at: ts,
  };
}

function con(id: string, source: string): Edge {
  return {
    id,
    type: "CONTRADICTS",
    layer: "argument",
    source,
    target: "x",
    created_at: ts,
    updated_at: ts,
  };
}

describe("countAttachedEdges", () => {
  it("counts answers / supports / contradicts for one premise", () => {
    const c = countAttachedEdges("p1", [
      ans("e1", "p1"),
      sup("e2", "p1"),
      sup("e3", "p1"),
      con("e4", "p1"),
      ans("e5", "p2"), // wrong source
    ]);
    expect(c).toEqual({ answers: 1, supports: 2, contradicts: 1, total: 4 });
  });

  it("returns zeros when premise has no edges", () => {
    expect(countAttachedEdges("p1", [])).toEqual({
      answers: 0,
      supports: 0,
      contradicts: 0,
      total: 0,
    });
  });
});
