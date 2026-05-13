import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshDb } from "./_setup";
import type { Frame, FrameVersion, ArgumentSession, ArgumentSessionVersion } from "@/schema";
import type { IndexedDbRepository } from "@/persistence";

/**
 * P0-4 regression: rapid edits inside the autosave debounce window each mint
 * a fresh in-memory chain (v1 → A → B → C) but only C reaches disk. Without
 * the saveFrameVersion fix, C.parent_version_id pointed at the in-memory B,
 * which never existed on disk. Version history's diff/preview/compare would
 * then throw "FrameVersion not found" when traversing the chain.
 *
 * Test contract: every persisted version's parent_version_id resolves via
 * loadFrameVersion, and version_number is contiguous on each frame.
 */
describe("saveFrameVersion / saveSessionVersion chain repair (P0-4)", () => {
  let repo: IndexedDbRepository;

  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  async function seedFrame(): Promise<{ frame: Frame; v1: FrameVersion }> {
    const { frame, version } = await repo.createBlankFrame({ title: "P0-4 test" });
    return { frame, v1: version };
  }

  it("rapid saves with optimistic in-memory chain — only last persists, but chain is repaired", async () => {
    const { v1 } = await seedFrame();
    // Simulate three in-memory hops: A → B → C. Each has a fresh id and an
    // optimistically-incremented version_number. Only the last is saved
    // (because autosave debounces and the test approximates that by only
    // calling saveFrameVersion once).
    const v_intermediate_A: FrameVersion = {
      ...v1,
      id: "v-A",
      parent_version_id: v1.id,
      version_number: 2,
    };
    const v_intermediate_B: FrameVersion = {
      ...v_intermediate_A,
      id: "v-B",
      parent_version_id: "v-A",
      version_number: 3,
    };
    const v_persisted_C: FrameVersion = {
      ...v_intermediate_B,
      id: "v-C",
      parent_version_id: "v-B", // <- THIS WAS THE BUG: points to never-persisted B
      version_number: 4, // <- and skips 2 and 3 on disk
    };
    await repo.saveFrameVersion(v_persisted_C);

    // Sanity: the saved version is reachable.
    const loaded_C = await repo.loadFrameVersion("v-C");
    expect(loaded_C.id).toBe("v-C");

    // Chain repair: parent_version_id should resolve to v1 (the prior on-disk
    // current), not to the never-persisted B.
    expect(loaded_C.parent_version_id).toBe(v1.id);
    expect(loaded_C.version_number).toBe(v1.version_number + 1);

    // Walking the chain end-to-end via loadFrameVersion must succeed.
    let cursor: FrameVersion | undefined = loaded_C;
    const chain: string[] = [];
    while (cursor) {
      chain.push(cursor.id);
      if (!cursor.parent_version_id) break;
      cursor = await repo.loadFrameVersion(cursor.parent_version_id);
    }
    expect(chain).toEqual(["v-C", v1.id]);
  });

  it("listFrameVersionSummaries reports contiguous version_numbers after rapid saves", async () => {
    const { v1, frame } = await seedFrame();
    // Three sequential saves; each one's pre-stamp says version_number=99 but
    // we expect the repository to repair to v1.vn+1, v1.vn+2, v1.vn+3.
    for (let i = 0; i < 3; i++) {
      const next: FrameVersion = {
        ...v1,
        id: `v-saved-${i}`,
        parent_version_id: "ghost-parent",
        version_number: 99,
      };
      await repo.saveFrameVersion(next);
    }
    const summaries = (await repo.listFrameVersionSummaries(frame.id)).sort(
      (a, b) => a.version_number - b.version_number,
    );
    expect(summaries.map((s) => s.version_number)).toEqual([1, 2, 3, 4]);
    // Every parent points to a real version_id (except v1).
    for (const s of summaries) {
      if (s.version_number === 1) {
        expect(s.parent_version_id).toBeUndefined();
      } else {
        expect(s.parent_version_id).toBeDefined();
        // The parent must be loadable.
        await expect(repo.loadFrameVersion(s.parent_version_id!)).resolves.toBeTruthy();
      }
    }
  });

  it("in-place save of an already-persisted version preserves its existing chain (regression: restoreVersion + change_summary second save)", async () => {
    const { v1, frame } = await seedFrame();
    // Save a v2 normally.
    const v2: FrameVersion = {
      ...v1,
      id: "v-2",
      parent_version_id: v1.id,
      version_number: 2,
    };
    await repo.saveFrameVersion(v2);
    // Now save the SAME id with a different change_summary — like restoreVersion does.
    const v2_with_summary: FrameVersion = { ...v2, change_summary: "Restored from v1" };
    await repo.saveFrameVersion(v2_with_summary);
    const loaded = await repo.loadFrameVersion("v-2");
    expect(loaded.parent_version_id).toBe(v1.id);
    expect(loaded.version_number).toBe(2);
    expect(loaded.change_summary).toBe("Restored from v1");
    // Frame's current is still v-2, not a phantom new version.
    const reloaded_frame = await repo.loadFrame(frame.id);
    expect(reloaded_frame.current_version_id).toBe("v-2");
  });

  it("sessions: rapid saves chain off the prior persisted session version", async () => {
    const { frame, v1 } = await seedFrame();

    // Build a session record + initial version.
    const session: ArgumentSession = {
      id: "s-1",
      frame_id: frame.id,
      frame_version_id: v1.id,
      frame_version_snapshot: v1,
      title: "P0-4 session",
      premises: [],
      argument_edges: [],
      checkpoint_responses: [],
      interpretation_selections: [],
      status_map: {},
      created_at: "2026-05-13T00:00:00.000Z",
      updated_at: "2026-05-13T00:00:00.000Z",
      current_version_id: "sv-1",
    };
    const sv1: ArgumentSessionVersion = {
      id: "sv-1",
      session_id: "s-1",
      version_number: 1,
      created_at: "2026-05-13T00:00:00.000Z",
      is_milestone: false,
      premises: [],
      argument_edges: [],
      checkpoint_responses: [],
      interpretation_selections: [],
    };
    await repo.saveSession(session);
    await repo.saveSessionVersion(sv1);

    // Now rapid-save sv-C with optimistic chain through never-persisted B.
    const sv_C: ArgumentSessionVersion = {
      ...sv1,
      id: "sv-C",
      parent_version_id: "sv-B-ghost",
      version_number: 4,
    };
    await repo.saveSessionVersion(sv_C);

    const loaded = await repo.loadSessionVersion("sv-C");
    expect(loaded.parent_version_id).toBe("sv-1");
    expect(loaded.version_number).toBe(2);
  });
});
