import { describe, it, expect } from "vitest";
import { resolveForeclosure, foreclosureScopeFor } from "@/runtime/foreclosure";
import { buildGraph } from "@/runtime/graph";
import {
  root,
  subQ,
  term,
  interp,
  conclusion,
  decomposesInto,
  turnsOn,
  interpretedAs,
  leadsTo,
  forecloses,
  makeFrame,
  T0,
} from "./_fixtures";
import type { Node, Edge } from "@/schema";

function makeMiniFrame(extras?: {
  termOrder?: { id: string; order: number; dispositive: boolean }[];
  forecloseSourceTarget?: Array<{
    id: string;
    source: string;
    target: string;
    scope?: "moot" | "decided";
  }>;
}): ReturnType<typeof makeFrame> {
  const baseTerms = extras?.termOrder ?? [{ id: "t1", order: 0, dispositive: false }];
  const nodes: Node[] = [
    root("r", "root"),
    subQ("sq", "merits"),
    ...baseTerms.map((t) => term(t.id, t.id, t.order, t.dispositive)),
    interp("i1a", "i1a"),
    interp("i1b", "i1b"),
    conclusion("c", "C"),
  ];
  const edges: Edge[] = [
    decomposesInto("ed", "r", "sq"),
    ...baseTerms.map((t, idx) => turnsOn(`et${idx}`, "sq", t.id)),
    interpretedAs("ia1", "t1", "i1a"),
    interpretedAs("ia2", "t1", "i1b"),
    leadsTo("la1", "i1a", "c"),
    leadsTo("lb1", "i1b", "c"),
    ...(extras?.forecloseSourceTarget ?? []).map((f) =>
      forecloses(f.id, f.source, f.target, f.scope ?? "moot"),
    ),
  ];
  return makeFrame({
    id: "f",
    title: "T",
    mode: "general",
    flavor: "academic",
    version_id: "fv-1",
    nodes,
    edges,
  });
}

describe("resolveForeclosure — explicit FORECLOSES", () => {
  it("foreclose target when source interpretation is selected", () => {
    const fr = makeMiniFrame({
      forecloseSourceTarget: [{ id: "fe1", source: "i1a", target: "i1b" }],
    });
    const graph = buildGraph(fr.version);
    const fc = resolveForeclosure(
      fr.version,
      {
        interpretation_selections: [
          { term_id: "t1", selected_interpretation_ids: ["i1a"], selected_at: T0 },
        ],
      },
      graph,
    );
    expect(fc.has("i1b")).toBe(true);
  });

  it("no foreclosure when source interpretation is not selected", () => {
    const fr = makeMiniFrame({
      forecloseSourceTarget: [{ id: "fe1", source: "i1a", target: "i1b" }],
    });
    const graph = buildGraph(fr.version);
    const fc = resolveForeclosure(fr.version, { interpretation_selections: [] }, graph);
    expect(fc.has("i1b")).toBe(false);
  });
});

describe("resolveForeclosure — dispositive Term auto-foreclosure", () => {
  it("first dispositive Term wins; siblings foreclosed", () => {
    // Two terms: t1 dispositive (order 0), t2 also dispositive (order 1).
    // Selection only on t1 → t2 foreclosed.
    const nodes: Node[] = [
      root("r", "root"),
      subQ("sq", "merits"),
      term("t1", "t1", 0, true),
      term("t2", "t2", 1, true),
      interp("i1a", "i1a"),
      interp("i1b", "i1b"),
      interp("i2a", "i2a"),
      interp("i2b", "i2b"),
      conclusion("c", "C"),
    ];
    const edges: Edge[] = [
      decomposesInto("ed", "r", "sq"),
      turnsOn("et1", "sq", "t1"),
      turnsOn("et2", "sq", "t2"),
      interpretedAs("ia1", "t1", "i1a"),
      interpretedAs("ia2", "t1", "i1b"),
      interpretedAs("ib1", "t2", "i2a"),
      interpretedAs("ib2", "t2", "i2b"),
      leadsTo("l1", "i1a", "c"),
      leadsTo("l2", "i1b", "c"),
      leadsTo("l3", "i2a", "c"),
      leadsTo("l4", "i2b", "c"),
    ];
    const fr = makeFrame({
      id: "f",
      title: "T",
      mode: "general",
      flavor: "academic",
      version_id: "fv",
      nodes,
      edges,
    });
    const graph = buildGraph(fr.version);
    const fc = resolveForeclosure(
      fr.version,
      {
        interpretation_selections: [
          { term_id: "t1", selected_interpretation_ids: ["i1a"], selected_at: T0 },
        ],
      },
      graph,
    );
    expect(fc.has("t2")).toBe(true);
  });

  it("no winner among dispositive Terms → no auto-foreclosure", () => {
    const fr = makeMiniFrame({
      termOrder: [{ id: "t1", order: 0, dispositive: true }],
    });
    const graph = buildGraph(fr.version);
    const fc = resolveForeclosure(fr.version, { interpretation_selections: [] }, graph);
    expect(fc.size).toBe(0);
  });
});

describe("foreclosureScopeFor", () => {
  it("explicit FORECLOSES with scope:decided → 'decided'", () => {
    const fr = makeMiniFrame({
      forecloseSourceTarget: [{ id: "fe1", source: "i1a", target: "i1b", scope: "decided" }],
    });
    const scope = foreclosureScopeFor("i1b", fr.version, {
      interpretation_selections: [
        { term_id: "t1", selected_interpretation_ids: ["i1a"], selected_at: T0 },
      ],
    });
    expect(scope).toBe("decided");
  });

  it("dispositive auto-foreclosure (no edge) → 'moot' by default", () => {
    const fr = makeMiniFrame();
    const scope = foreclosureScopeFor("t1", fr.version, {
      interpretation_selections: [],
    });
    expect(scope).toBe("moot");
  });
});
