import { describe, it, expect } from "vitest";
import {
  createFrameFromTemplate,
  restoreFrameVersion,
  restoreSessionVersion,
  enumerateOrphanCandidates,
} from "@/modes";
import {
  mockRepository,
  makeFv,
  makeRoot,
  makeTerm,
  makeCheckpoint,
  makeSession,
  makeEdge,
} from "./_fixtures";
import type { Frame, FrameVersion } from "@/schema";

const T = "2026-05-01T00:00:00.000Z";

const STUB_FRAME: Frame = {
  id: "fr-new",
  title: "New Frame",
  mode: "general",
  default_satisfaction_policies: {},
  tags: [],
  pinned: false,
  created_at: T,
  updated_at: T,
  current_version_id: "fv-new",
};

describe("modes/orchestration", () => {
  describe("createFrameFromTemplate", () => {
    it("invokes Repository.createFrameFromTemplate with exact args", async () => {
      const repo = mockRepository({
        createFrameFromTemplate: async (_id, title) => ({ ...STUB_FRAME, id: "fr-copy", title }),
      });
      const result = await createFrameFromTemplate(repo, "fr-tmpl", "My Copy");
      expect(repo.calls["createFrameFromTemplate"]).toHaveLength(1);
      expect(repo.calls["createFrameFromTemplate"]?.[0]).toEqual(["fr-tmpl", "My Copy"]);
      expect(result.title).toBe("My Copy");
    });

    it("propagates the resolved Frame unmodified", async () => {
      const repo = mockRepository({
        createFrameFromTemplate: async () => STUB_FRAME,
      });
      const result = await createFrameFromTemplate(repo, "fr-1", "T");
      expect(result).toBe(STUB_FRAME);
    });
  });

  describe("restoreFrameVersion", () => {
    it("invokes repo.restoreFrameVersion with exact args and propagates result", async () => {
      const fv = makeFv({ id: "fv-restored" });
      const repo = mockRepository({
        restoreFrameVersion: async () => fv,
      });
      const result = await restoreFrameVersion(repo, "fr-1", "fv-ancestor");
      expect(repo.calls["restoreFrameVersion"]?.[0]).toEqual(["fr-1", "fv-ancestor"]);
      expect(result).toBe(fv);
    });
  });

  describe("restoreSessionVersion", () => {
    it("invokes repo.restoreSessionVersion with exact args", async () => {
      const sv = {
        id: "sv-restored",
        session_id: "s-1",
        version_number: 5,
        created_at: T,
        is_milestone: false,
        premises: [],
        argument_edges: [],
        checkpoint_responses: [],
        interpretation_selections: [],
      };
      const repo = mockRepository({ restoreSessionVersion: async () => sv as never });
      const result = await restoreSessionVersion(repo, "s-1", "sv-ancestor");
      expect(repo.calls["restoreSessionVersion"]?.[0]).toEqual(["s-1", "sv-ancestor"]);
      expect(result).toBe(sv);
    });
  });

  describe("enumerateOrphanCandidates", () => {
    it("returns [] when all session references resolve in target", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-1");
      const prior = makeFv({ nodes: [root, cp] });
      const target = makeFv({ nodes: [root, cp] });
      const session = makeSession({
        frame_version_snapshot: prior,
        checkpoint_responses: [
          {
            checkpoint_id: "cp-1",
            selected_option_id: "opt-yes-cp-1",
            premise_id: "p-1",
            answered_at: T,
          },
        ],
      });
      const result = enumerateOrphanCandidates(session, target);
      expect(result).toHaveLength(0);
    });

    it("emits a checkpoint_response orphan when checkpoint is deleted", () => {
      const root = makeRoot("root");
      const cp = makeCheckpoint("cp-deleted");
      const prior = makeFv({ nodes: [root, cp] });
      const target = makeFv({ nodes: [root] }); // cp-deleted removed
      const session = makeSession({
        frame_version_snapshot: prior,
        checkpoint_responses: [
          {
            checkpoint_id: "cp-deleted",
            selected_option_id: "opt-yes",
            premise_id: "p-1",
            answered_at: T,
          },
        ],
      });
      const result = enumerateOrphanCandidates(session, target);
      expect(
        result.some(
          (c) => c.carrier_kind === "checkpoint_response" && c.source_node_id === "cp-deleted",
        ),
      ).toBe(true);
    });

    it("emits an interpretation_selection orphan when term is deleted", () => {
      const root = makeRoot("root");
      const term = makeTerm("term-gone", 0);
      const prior = makeFv({ nodes: [root, term] });
      const target = makeFv({ nodes: [root] });
      const session = makeSession({
        frame_version_snapshot: prior,
        interpretation_selections: [
          { term_id: "term-gone", selected_interpretation_ids: ["interp-1"], selected_at: T },
        ],
      });
      const result = enumerateOrphanCandidates(session, target);
      expect(
        result.some(
          (c) => c.carrier_kind === "interpretation_selection" && c.source_node_id === "term-gone",
        ),
      ).toBe(true);
    });

    it("emits an argument_edge orphan when source node is deleted", () => {
      const root = makeRoot("root");
      const prior = makeFv({ nodes: [root] });
      const target = makeFv({ nodes: [root] });
      const session = makeSession({
        frame_version_snapshot: prior,
        argument_edges: [
          {
            id: "ae-1",
            type: "SUPPORTS",
            layer: "argument",
            source: "gone-node",
            target: "root",
            created_at: T,
            updated_at: T,
          },
        ],
      });
      const result = enumerateOrphanCandidates(session, target);
      expect(
        result.some((c) => c.carrier_kind === "argument_edge" && c.source_node_id === "gone-node"),
      ).toBe(true);
    });

    it("sorts candidates by (carrier_kind, carrier_id) deterministically", () => {
      const root = makeRoot("root");
      const prior = makeFv({ nodes: [root] });
      const target = makeFv({ nodes: [root] });
      const session = makeSession({
        frame_version_snapshot: prior,
        checkpoint_responses: [
          { checkpoint_id: "cp-z", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
          { checkpoint_id: "cp-a", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
        ],
      });
      const r1 = enumerateOrphanCandidates(session, target);
      const session2 = makeSession({
        frame_version_snapshot: prior,
        checkpoint_responses: [
          { checkpoint_id: "cp-a", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
          { checkpoint_id: "cp-z", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
        ],
      });
      const r2 = enumerateOrphanCandidates(session2, target);
      expect(r1.map((c) => c.carrier_id)).toEqual(r2.map((c) => c.carrier_id));
    });

    it("suggests reattach when exactly one same-type same-parent target exists (Term via TURNS_ON)", () => {
      const root = makeRoot("root");
      const term_old = makeTerm("term-old", 0);
      const term_new = makeTerm("term-new", 0);
      const prior = makeFv({
        nodes: [root, term_old],
        edges: [makeEdge("e1", "TURNS_ON", "root", "term-old")],
      });
      const target: FrameVersion = makeFv({
        nodes: [root, term_new],
        edges: [makeEdge("e2", "TURNS_ON", "root", "term-new")],
      });
      const session = makeSession({
        frame_version_snapshot: prior,
        interpretation_selections: [
          { term_id: "term-old", selected_interpretation_ids: ["interp-1"], selected_at: T },
        ],
      });
      const result = enumerateOrphanCandidates(session, target);
      // term-old is gone, term-new has same parent (root via TURNS_ON); suggest reattach
      const orphan = result.find((c) => c.source_node_id === "term-old");
      expect(orphan?.suggested_kind).toBe("reattach");
      expect(orphan?.suggested_target_node_id).toBe("term-new");
    });

    it("is byte-identical on repeated invocation with same inputs", () => {
      const root = makeRoot("root");
      const prior = makeFv({ nodes: [root] });
      const target = makeFv({ nodes: [root] });
      const session = makeSession({
        frame_version_snapshot: prior,
        checkpoint_responses: [
          { checkpoint_id: "cp-1", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
        ],
      });
      const r1 = enumerateOrphanCandidates(session, target);
      const r2 = enumerateOrphanCandidates(session, target);
      expect(r1).toEqual(r2);
    });
  });
});
