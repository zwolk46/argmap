import { describe, it, expect } from "vitest";
import { createFrameFromTemplate, restoreFrameVersion, restoreSessionVersion } from "@/modes";
import { mockRepository, makeFv } from "./_fixtures";
import type { Frame } from "@/schema";

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

  // The earlier `enumerateOrphanCandidates` tests that lived here were
  // exercising the modes-side duplicate that was unused in production. The
  // canonical version lives in @/runtime/extras and is tested in
  // tests/runtime/extras-orphans.test.ts.
});
