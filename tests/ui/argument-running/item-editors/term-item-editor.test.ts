import { describe, it, expect } from "vitest";
import { listTermInterpretations } from "@/ui/argument-running/item-editors/term-item-editor";
import type { Node, Edge, NodeRef, Term } from "@/schema";

const ts = "2026-05-12T00:00:00.000Z";

function term(id: string): Term {
  return {
    id,
    type: "Term",
    layer: "frame",
    name: id,
    order: 0,
    dispositive: false,
    created_at: ts,
    updated_at: ts,
  };
}

function interp(id: string, statement = id): Node {
  return {
    id,
    type: "Interpretation",
    layer: "frame",
    statement,
    created_at: ts,
    updated_at: ts,
  };
}

function interp_edge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    type: "INTERPRETED_AS",
    layer: "frame",
    source,
    target,
    created_at: ts,
    updated_at: ts,
  };
}

describe("listTermInterpretations", () => {
  it("returns interpretations referenced by INTERPRETED_AS edges, sorted by id", () => {
    const t = term("t1");
    const i1 = interp("z1");
    const i2 = interp("a1");
    const nodes_by_id = new Map<NodeRef, Node>([
      [t.id, t],
      [i1.id, i1],
      [i2.id, i2],
    ]);
    const edges: Edge[] = [interp_edge("t1", "z1"), interp_edge("t1", "a1")];
    const out = listTermInterpretations(t, nodes_by_id, edges);
    expect(out.map((x) => x.id)).toEqual(["a1", "z1"]);
  });

  it("ignores non-INTERPRETED_AS edges", () => {
    const t = term("t1");
    const nodes_by_id = new Map<NodeRef, Node>([[t.id, t]]);
    const edges: Edge[] = [
      {
        id: "e",
        type: "TURNS_ON",
        layer: "frame",
        source: "t1",
        target: "x",
        created_at: ts,
        updated_at: ts,
      },
    ];
    expect(listTermInterpretations(t, nodes_by_id, edges)).toHaveLength(0);
  });

  it("ignores edges sourced from other terms", () => {
    const t = term("t1");
    const i = interp("i1");
    const nodes_by_id = new Map<NodeRef, Node>([
      [t.id, t],
      [i.id, i],
    ]);
    const edges: Edge[] = [interp_edge("other-term", "i1")];
    expect(listTermInterpretations(t, nodes_by_id, edges)).toHaveLength(0);
  });
});
