import { describe, it, expect } from "vitest";
import { frameToElkGraph, elkResultToLayoutResult } from "@/layout/elk-mapping";
import {
  buildSimpleFrame,
  buildFrameWithCollapsedSubQuestion,
  buildFrameWithAuthority,
} from "./_fixtures";

describe("layout/elk-mapping", () => {
  describe("frameToElkGraph", () => {
    it("includes every node when collapse_subquestions is false", () => {
      const frame = buildFrameWithCollapsedSubQuestion();
      const out = frameToElkGraph(frame, { collapse_subquestions: false });
      expect(out.children.map((c) => c.id).sort()).toEqual(frame.nodes.map((n) => n.id).sort());
    });

    it("excludes descendants of a collapsed SubQuestion", () => {
      const frame = buildFrameWithCollapsedSubQuestion();
      const out = frameToElkGraph(frame, { collapse_subquestions: true });
      expect(out.children.find((c) => c.id === "sq_collapsed")).toBeDefined();
      expect(out.children.find((c) => c.id === "term_a")).toBeUndefined();
      expect(out.children.find((c) => c.id === "term_b")).toBeUndefined();
      expect(out.children.find((c) => c.id === "concl_x")).toBeUndefined();
    });

    it("keeps shared descendants visible when reachable from a non-collapsed ancestor", () => {
      const frame = buildFrameWithCollapsedSubQuestion();
      const out = frameToElkGraph(frame, { collapse_subquestions: true });
      expect(out.children.find((c) => c.id === "term_shared")).toBeDefined();
    });

    it("always includes Authority nodes regardless of collapse state", () => {
      const frame = buildFrameWithAuthority();
      const out = frameToElkGraph(frame, { collapse_subquestions: true });
      expect(out.children.find((c) => c.id === "auth_1")).toBeDefined();
    });

    it("marks anchored nodes with an elk.position hint when honor_user_anchors is true", () => {
      // P2: the previous assertion also checked for `elk.layered.fixed: "true"`,
      // which is not a valid ELK option key. Anchored coordinates are
      // actually pinned by the post-process in run.ts:29-41; the bare
      // `elk.position` hint is the only ELK-recognized signal we set.
      const frame = buildSimpleFrame({ anchorRoot: { x: 100, y: 200 } });
      const out = frameToElkGraph(frame, { honor_user_anchors: true });
      const root = out.children.find((c) => c.id === "root_q")!;
      expect(root.x).toBe(100);
      expect(root.y).toBe(200);
      expect(root.layoutOptions?.["elk.position"]).toBe("(100,200)");
    });

    it("does NOT mark anchors when honor_user_anchors is false", () => {
      const frame = buildSimpleFrame({ anchorRoot: { x: 100, y: 200 } });
      const out = frameToElkGraph(frame, { honor_user_anchors: false });
      const root = out.children.find((c) => c.id === "root_q")!;
      expect(root.x).toBeUndefined();
      expect(root.y).toBeUndefined();
      expect(root.layoutOptions).toBeUndefined();
    });

    it("does NOT anchor a node with only one of x or y set", () => {
      const frame = buildSimpleFrame({ anchorRoot: { x: 100 } as { x: number } });
      const out = frameToElkGraph(frame, { honor_user_anchors: true });
      const root = out.children.find((c) => c.id === "root_q")!;
      expect(root.x).toBeUndefined();
      expect(root.layoutOptions).toBeUndefined();
    });

    it("emits children sorted by node id", () => {
      const frame = buildSimpleFrame();
      const out = frameToElkGraph(frame);
      const ids = out.children.map((c) => c.id);
      expect(ids).toEqual([...ids].sort());
    });

    it("emits edges sorted by edge id and filtered to LAID_OUT_EDGE_TYPES", () => {
      const frame = buildSimpleFrame();
      const out = frameToElkGraph(frame);
      const ids = out.edges.map((e) => e.id);
      expect(ids).toEqual([...ids].sort());
      for (const e of out.edges) {
        expect(["SUPPORTS", "CONTRADICTS", "ANSWERS"]).not.toContain(
          frame.edges.find((fe) => fe.id === e.id)!.type,
        );
      }
    });

    it("is insensitive to input order", () => {
      const frame = buildSimpleFrame();
      const out1 = frameToElkGraph(frame);
      const shuffled = {
        ...frame,
        nodes: [...frame.nodes].reverse(),
        edges: [...frame.edges].reverse(),
      };
      const out2 = frameToElkGraph(shuffled);
      expect(out2).toEqual(out1);
    });

    it("returns an authority-only set when RootQuestion is missing and collapse is on", () => {
      const frame = buildSimpleFrame({ omitRoot: true, withAuthority: true });
      const out = frameToElkGraph(frame, { collapse_subquestions: true });
      expect(out.children.map((c) => c.id)).toEqual(["auth_1"]);
    });

    it("writes a warning when a Premise node leaks into frame.nodes (defensive)", () => {
      const frame = buildSimpleFrame({ withStrayPremise: true });
      const warnings: string[] = [];
      const out = frameToElkGraph(frame, undefined, warnings);
      expect(out.children.find((c) => c.id === "stray_premise")).toBeUndefined();
      expect(warnings.some((w) => w.includes("stray_premise"))).toBe(true);
    });

    it("attaches both ELK_LAYERED_OPTIONS and elk.direction at the graph level", () => {
      const frame = buildSimpleFrame();
      const out = frameToElkGraph(frame, { direction: "RIGHT" });
      expect(out.layoutOptions["elk.algorithm"]).toBe("layered");
      expect(out.layoutOptions["elk.direction"]).toBe("RIGHT");
    });

    it("uses the literal root id 'root' independent of frame.id", () => {
      const a = buildSimpleFrame({ frameId: "frame_a" });
      const b = buildSimpleFrame({ frameId: "frame_b" });
      expect(frameToElkGraph(a).id).toBe("root");
      expect(frameToElkGraph(b).id).toBe("root");
    });
  });

  describe("elkResultToLayoutResult", () => {
    it("returns positions sorted by node_id", () => {
      const elk = {
        id: "root",
        width: 800,
        height: 600,
        children: [
          { id: "z", x: 1, y: 2, width: 10, height: 10 },
          { id: "a", x: 3, y: 4, width: 10, height: 10 },
          { id: "m", x: 5, y: 6, width: 10, height: 10 },
        ],
      };
      const out = elkResultToLayoutResult(elk, "2026-05-11T00:00:00.000Z");
      expect(out.positions.map((p) => p.node_id)).toEqual(["a", "m", "z"]);
    });

    it("propagates width and height verbatim", () => {
      const elk = { id: "root", width: 800, height: 600, children: [] };
      const out = elkResultToLayoutResult(elk, "frozen");
      expect(out.width).toBe(800);
      expect(out.height).toBe(600);
    });

    it("propagates computed_at verbatim", () => {
      const elk = { id: "root", width: 0, height: 0, children: [] };
      const out = elkResultToLayoutResult(elk, "frozen-clock");
      expect(out.computed_at).toBe("frozen-clock");
    });
  });
});
