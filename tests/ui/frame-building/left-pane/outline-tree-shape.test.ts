import { describe, it, expect } from "vitest";
import type { FrameVersion, RootQuestion, SubQuestion } from "@/schema";
import { buildOutlineShape } from "@/ui/frame-building/left-pane/outline-tree-shape";

// Minimal node factories (schema requires id + type at minimum).
const makeRootQuestion = (id: string): RootQuestion =>
  ({ id, type: "RootQuestion", statement: "Root Q", x: 0, y: 0 }) as unknown as RootQuestion;

const makeSubQuestion = (id: string): SubQuestion =>
  ({ id, type: "SubQuestion", statement: "Sub Q", x: 0, y: 0 }) as unknown as SubQuestion;

function makeEdge(
  id: string,
  source: string,
  target: string,
  type: "DECOMPOSES_INTO" | "LEADS_TO",
) {
  return { id, source, target, type };
}

function makeFrameVersion(nodes: object[], edges: object[]): FrameVersion {
  return {
    id: "fv1",
    frame_id: "f1",
    version_number: 1,
    created_at: "2026-01-01",
    nodes: nodes as FrameVersion["nodes"],
    edges: edges as FrameVersion["edges"],
    is_milestone: false,
  };
}

describe("buildOutlineShape", () => {
  it("returns null when no RootQuestion exists", () => {
    const fv = makeFrameVersion([makeSubQuestion("sq1")], []);
    expect(buildOutlineShape(fv)).toBeNull();
  });

  it("returns root node when only RootQuestion exists", () => {
    const fv = makeFrameVersion([makeRootQuestion("rq1")], []);
    const result = buildOutlineShape(fv);
    expect(result).not.toBeNull();
    expect(result!.node_id).toBe("rq1");
    expect(result!.node_type).toBe("RootQuestion");
    expect(result!.children).toHaveLength(0);
  });

  it("is deterministic: calling twice gives deep-equal result", () => {
    const rq = makeRootQuestion("rq1");
    const sq1 = makeSubQuestion("sq1");
    const sq2 = makeSubQuestion("sq2");
    const edge1 = makeEdge("e1", "rq1", "sq1", "DECOMPOSES_INTO");
    const edge2 = makeEdge("e2", "rq1", "sq2", "DECOMPOSES_INTO");
    const fv = makeFrameVersion([rq, sq1, sq2], [edge1, edge2]);

    const result1 = buildOutlineShape(fv);
    const result2 = buildOutlineShape(fv);
    expect(result1).toEqual(result2);
  });

  it("places DECOMPOSES_INTO children under root", () => {
    const rq = makeRootQuestion("rq1");
    const sq = makeSubQuestion("sq1");
    const edge = makeEdge("e1", "rq1", "sq1", "DECOMPOSES_INTO");
    const fv = makeFrameVersion([rq, sq], [edge]);

    const result = buildOutlineShape(fv);
    expect(result).not.toBeNull();
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0].node_id).toBe("sq1");
    expect(result!.children[0].node_type).toBe("SubQuestion");
  });

  it("does not include nodes not connected by a recognized edge type", () => {
    const rq = makeRootQuestion("rq1");
    const sq = makeSubQuestion("sq1");
    // No edge connecting them
    const fv = makeFrameVersion([rq, sq], []);
    const result = buildOutlineShape(fv);
    expect(result!.children).toHaveLength(0);
  });

  it("places LEADS_TO children under root", () => {
    const rq = makeRootQuestion("rq1");
    const sq = makeSubQuestion("sq1");
    const edge = makeEdge("e1", "rq1", "sq1", "LEADS_TO");
    const fv = makeFrameVersion([rq, sq], [edge]);

    const result = buildOutlineShape(fv);
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0].node_id).toBe("sq1");
  });

  it("sorts multiple children by edge type priority then edge id", () => {
    const rq = makeRootQuestion("rq1");
    const sq1 = makeSubQuestion("sq1");
    const sq2 = makeSubQuestion("sq2");
    // e1 is LEADS_TO (lower priority), e2 is DECOMPOSES_INTO (higher priority)
    const edge1 = makeEdge("e1", "rq1", "sq1", "LEADS_TO");
    const edge2 = makeEdge("e2", "rq1", "sq2", "DECOMPOSES_INTO");
    const fv = makeFrameVersion([rq, sq1, sq2], [edge1, edge2]);

    const result = buildOutlineShape(fv);
    // DECOMPOSES_INTO (priority 0) before LEADS_TO (priority 3)
    expect(result!.children[0].node_id).toBe("sq2");
    expect(result!.children[1].node_id).toBe("sq1");
  });
});
