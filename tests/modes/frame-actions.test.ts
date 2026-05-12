import { describe, it, expect } from "vitest";
import { frameActions, CascadeConfirmationRequired } from "@/modes";
import { makeFv, makeRoot, makeSubQ, makeEdge } from "./_fixtures";
import type { Frame, Node } from "@/schema";
import type { DispatchOpts, FramePatch } from "@/state";

const T = "2026-05-10T00:00:00.000Z";

const frame: Frame = {
  id: "fr-test",
  title: "Test",
  mode: "general",
  default_satisfaction_policies: {},
  tags: [],
  pinned: false,
  created_at: T,
  updated_at: T,
  current_version_id: "fv-test",
};

const opts: DispatchOpts = {
  now: T,
  generateId: (() => {
    let i = 0;
    return () => `gen-${++i}`;
  })(),
};

describe("modes/frame-actions", () => {
  describe("node_added", () => {
    it("appends the node to next_version.nodes", () => {
      const fv = makeFv({ nodes: [makeRoot("root")] });
      const node = makeSubQ("sub-1");
      const patch: FramePatch = { kind: "node_added", node };
      const result = frameActions.node_added(frame, fv, patch, opts);
      expect(result.next_version.nodes).toHaveLength(2);
      expect(result.next_version.nodes[1]?.id).toBe("sub-1");
    });

    it("preserves prior nodes byte-for-byte", () => {
      const root = makeRoot("root");
      const fv = makeFv({ nodes: [root] });
      const result = frameActions.node_added(
        frame,
        fv,
        { kind: "node_added", node: makeSubQ("new") },
        opts,
      );
      expect(result.next_version.nodes[0]).toBe(root);
    });

    it("does not touch frame_partial (runner updates frame)", () => {
      const fv = makeFv();
      const result = frameActions.node_added(
        frame,
        fv,
        { kind: "node_added", node: makeSubQ("x") },
        opts,
      );
      expect(result.frame_partial).toBeUndefined();
    });
  });

  describe("node_edited", () => {
    it("applies partial, preserving id and type", () => {
      const root = makeRoot("root");
      const fv = makeFv({ nodes: [root] });
      const patch: FramePatch = {
        kind: "node_edited",
        node_id: "root",
        partial: { statement: "Updated?" } as Partial<Node>,
      };
      const result = frameActions.node_edited(frame, fv, patch, opts);
      const updated = result.next_version.nodes.find((n) => n.id === "root");
      expect((updated as { statement?: string }).statement).toBe("Updated?");
      expect(updated?.type).toBe("RootQuestion");
    });
  });

  describe("node_removed", () => {
    it("removes target node and incident edges (trivial cascade)", () => {
      const root = makeRoot("root");
      const sub = makeSubQ("sub");
      const fv = makeFv({
        nodes: [root, sub],
        edges: [makeEdge("e1", "DECOMPOSES_INTO", "root", "sub")],
      });
      const patch: FramePatch = { kind: "node_removed", node_id: "sub" };
      const result = frameActions.node_removed(frame, fv, patch, opts);
      expect(result.next_version.nodes.map((n) => n.id)).not.toContain("sub");
      expect(result.next_version.edges).toHaveLength(0);
    });

    it("throws CascadeConfirmationRequired for non-trivial cascade", () => {
      const root = makeRoot("root");
      const a = makeSubQ("a");
      const b = makeSubQ("b");
      const fv = makeFv({
        nodes: [root, a, b],
        edges: [
          makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
          makeEdge("e2", "DECOMPOSES_INTO", "a", "b"),
        ],
      });
      const patch: FramePatch = { kind: "node_removed", node_id: "a" };
      expect(() => frameActions.node_removed(frame, fv, patch, opts)).toThrow(
        CascadeConfirmationRequired,
      );
    });

    it("uses pre-confirmed cascade list when provided", () => {
      const root = makeRoot("root");
      const a = makeSubQ("a");
      const b = makeSubQ("b");
      const fv = makeFv({
        nodes: [root, a, b],
        edges: [
          makeEdge("e1", "DECOMPOSES_INTO", "root", "a"),
          makeEdge("e2", "DECOMPOSES_INTO", "a", "b"),
        ],
      });
      const patch: FramePatch = {
        kind: "node_removed",
        node_id: "a",
        cascade: { node_ids: ["b"], edge_ids: ["e1", "e2"] },
      };
      const result = frameActions.node_removed(frame, fv, patch, opts);
      const remaining = result.next_version.nodes.map((n) => n.id);
      expect(remaining).not.toContain("a");
      expect(remaining).not.toContain("b");
      expect(remaining).toContain("root");
    });

    it("clears stale CheckpointOption.target_node_ids on surviving Checkpoints", () => {
      const root = makeRoot("root");
      const cp: import("@/schema").Checkpoint = {
        id: "cp",
        type: "Checkpoint",
        layer: "frame",
        question: "Q?",
        answer_type: "boolean",
        options: [{ id: "opt", label: "Yes", satisfies: true, target_node_id: "sub" }],
        requires_premise: false,
        requires_authority: false,
        created_at: T,
        updated_at: T,
      };
      const sub = makeSubQ("sub");
      const fv = makeFv({
        nodes: [root, cp, sub],
        edges: [
          makeEdge("e1", "DECOMPOSES_INTO", "root", "sub"),
          makeEdge("e2", "LEADS_TO", "root", "cp"),
        ],
      });
      // Only delete 'sub' (trivial cascade from 'sub' since it has DECOMPOSES_INTO from root that gets it)
      // But sub also has route from root so let's just delete sub directly
      const patch: FramePatch = { kind: "node_removed", node_id: "sub" };
      const result = frameActions.node_removed(frame, fv, patch, opts);
      const surviving_cp = result.next_version.nodes.find((n) => n.id === "cp") as
        | import("@/schema").Checkpoint
        | undefined;
      expect(surviving_cp?.options[0]?.target_node_id).toBeUndefined();
    });
  });

  describe("edge_added", () => {
    it("appends edge to next_version.edges", () => {
      const fv = makeFv({ edges: [] });
      const edge = makeEdge("e1", "DECOMPOSES_INTO", "root", "sub");
      const result = frameActions.edge_added(frame, fv, { kind: "edge_added", edge }, opts);
      expect(result.next_version.edges).toHaveLength(1);
      expect(result.next_version.edges[0]?.id).toBe("e1");
    });
  });

  describe("edge_removed", () => {
    it("removes the named edge", () => {
      const fv = makeFv({ edges: [makeEdge("e1", "DECOMPOSES_INTO", "root", "sub")] });
      const result = frameActions.edge_removed(
        frame,
        fv,
        { kind: "edge_removed", edge_id: "e1" },
        opts,
      );
      expect(result.next_version.edges).toHaveLength(0);
    });
  });

  describe("metadata_edited", () => {
    it("returns frame_partial with the supplied partial", () => {
      const fv = makeFv();
      const result = frameActions.metadata_edited(
        frame,
        fv,
        { kind: "metadata_edited", partial: { title: "New Title" } },
        opts,
      );
      expect(result.frame_partial?.title).toBe("New Title");
    });
  });

  describe("presentation_hints_reset_all", () => {
    it("clears presentation field from all nodes", () => {
      const root: Node = {
        ...makeRoot("root"),
        presentation: { x: 10, y: 20 },
      };
      const fv = makeFv({ nodes: [root] });
      const result = frameActions.presentation_hints_reset_all(
        frame,
        fv,
        { kind: "presentation_hints_reset_all" },
        opts,
      );
      expect(result.next_version.nodes[0]?.presentation).toBeUndefined();
    });
  });

  describe("architectural_mode_changed", () => {
    it("applies conclusion_direction_resolutions and populates frame_partial.mode", () => {
      const conclusion: import("@/schema").Conclusion = {
        id: "conc",
        type: "Conclusion",
        layer: "frame",
        statement: "Result",
        direction: { kind: "general", position_id: "pos-1" },
        created_at: T,
        updated_at: T,
      };
      const fv = makeFv({ nodes: [makeRoot("root"), conclusion] });
      const patch: FramePatch = {
        kind: "architectural_mode_changed",
        target_mode: "legal",
        conclusion_direction_resolutions: [
          { node_id: "conc", direction: { kind: "legal", value: "affirm" } },
        ],
        change_summary: "Switched to legal mode",
      };
      const result = frameActions.architectural_mode_changed(frame, fv, patch, opts);
      const updated_conc = result.next_version.nodes.find((n) => n.id === "conc") as
        | import("@/schema").Conclusion
        | undefined;
      expect(updated_conc?.direction).toEqual({ kind: "legal", value: "affirm" });
      expect(result.frame_partial?.mode).toBe("legal");
      expect(result.change_summary).toBe("Switched to legal mode");
    });
  });

  describe("determinism", () => {
    it("node_added produces identical result on two invocations", () => {
      const fv = makeFv({ nodes: [makeRoot("root")] });
      const node = makeSubQ("s");
      const freshOpts = (): DispatchOpts => ({
        now: T,
        generateId: (() => {
          let i = 0;
          return () => `g-${++i}`;
        })(),
      });
      const r1 = frameActions.node_added(frame, fv, { kind: "node_added", node }, freshOpts());
      const r2 = frameActions.node_added(frame, fv, { kind: "node_added", node }, freshOpts());
      expect(r1).toEqual(r2);
    });
  });
});
