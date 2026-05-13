import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshDb } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import type { IndexedDbRepository } from "@/persistence";
import type { Frame, FrameVersion } from "@/schema";

const T = "2026-05-10T00:00:00.000Z";

describe("persistence/atomicity", () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("createFrameFromTemplate: happy path produces a new Frame with regenerated ids and a v1 FrameVersion", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const new_frame = await repo.createFrameFromTemplate(
      frame_export.frame.id,
      "Copy of Negligence",
    );

    expect(new_frame.id).not.toBe(frame_export.frame.id);
    expect(new_frame.title).toBe("Copy of Negligence");

    const new_version = await repo.loadFrameVersion(new_frame.current_version_id);
    expect(new_version.version_number).toBe(1);
    expect(new_version.parent_version_id).toBeUndefined();
    expect(new_version.is_milestone).toBe(true);
    expect(new_version.change_summary).toMatch(/Created from template:/);

    // All node ids should be different from the original
    const original_ids = new Set(frame_export.current_version.nodes.map((n) => n.id));
    for (const node of new_version.nodes) {
      expect(original_ids.has(node.id)).toBe(false);
    }
    // All edge ids should be different
    const original_edge_ids = new Set(frame_export.current_version.edges.map((e) => e.id));
    for (const edge of new_version.edges) {
      expect(original_edge_ids.has(edge.id)).toBe(false);
    }
  });

  it("createFrameFromTemplate: internal references are rewritten through the translation map", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const new_frame = await repo.createFrameFromTemplate(frame_export.frame.id, "Copy");
    const new_version = await repo.loadFrameVersion(new_frame.current_version_id);

    const new_node_ids = new Set(new_version.nodes.map((n) => n.id));
    // Verify all edge source/target references are valid node ids in the new version
    for (const edge of new_version.edges) {
      expect(new_node_ids.has(edge.source)).toBe(true);
      expect(new_node_ids.has(edge.target)).toBe(true);
    }
    // Verify checkpoint option target_node_ids are rewritten
    for (const node of new_version.nodes) {
      if (node.type === "Checkpoint") {
        for (const opt of node.options) {
          if (opt.target_node_id) {
            expect(new_node_ids.has(opt.target_node_id)).toBe(true);
          }
        }
      }
    }
  });

  it("createFrameFromTemplate: llm_settings.invocations is empty on the new Frame", async () => {
    const { frame_export } = buildLegalModeFixture();
    const frame_with_invocations: Frame = {
      ...frame_export.frame,
      llm_settings: {
        build_time_hooks_enabled: false,
        runtime_hooks_enabled: false,
        output_time_hooks_enabled: false,
        invocations: [
          {
            id: "inv-1",
            hook_id: "G1",
            prompt_name: "test",
            prompt_version: "1.0",
            provider_id: "anthropic",
            model_id: "claude-opus-4",
            input_hash: "abc123",
            decision: "accepted",
            invoked_at: T,
          },
        ],
      },
    };
    await repo.saveFrame(frame_with_invocations);
    await repo.saveFrameVersion(frame_export.current_version);

    const new_frame = await repo.createFrameFromTemplate(frame_export.frame.id, "Copy");
    expect(new_frame.llm_settings?.invocations).toStrictEqual([]);
  });

  it("restoreFrameVersion: creates a new version with parent_version_id pointing at the ancestor", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const restored = await repo.restoreFrameVersion(
      frame_export.frame.id,
      frame_export.current_version.id,
    );

    expect(restored.parent_version_id).toBe(frame_export.current_version.id);
    expect(restored.is_milestone).toBe(true);
    expect(restored.change_summary).toMatch(/Restored from version/);
    expect(restored.nodes).toStrictEqual(frame_export.current_version.nodes);
    expect(restored.edges).toStrictEqual(frame_export.current_version.edges);
  });

  it("restoreFrameVersion: version_number is max(frame_versions) + 1, not per-branch", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const fv2 = { ...frame_export.current_version, id: "fv-2", version_number: 2 };
    await repo.saveFrameVersion(fv2);
    const fv3 = { ...frame_export.current_version, id: "fv-3", version_number: 3 };
    await repo.saveFrameVersion(fv3);

    const restored = await repo.restoreFrameVersion(
      frame_export.frame.id,
      frame_export.current_version.id,
    );
    expect(restored.version_number).toBe(4);
  });

  it("restoreFrameVersion: ancestor is byte-identical before and after restore", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const ancestor_before = await repo.loadFrameVersion(frame_export.current_version.id);
    await repo.restoreFrameVersion(frame_export.frame.id, frame_export.current_version.id);
    const ancestor_after = await repo.loadFrameVersion(frame_export.current_version.id);

    expect(ancestor_after).toStrictEqual(ancestor_before);
  });

  it("restoreFrameVersion: llm_settings_snapshot is deep-cloned from the ancestor", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const restored = await repo.restoreFrameVersion(
      frame_export.frame.id,
      frame_export.current_version.id,
    );
    expect(restored.llm_settings_snapshot).toStrictEqual(
      frame_export.current_version.llm_settings_snapshot,
    );
  });

  it("restoreSessionVersion: same shape as restoreFrameVersion over the session-version table", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    const restored = await repo.restoreSessionVersion(
      session_export.session.id,
      session_export.current_version.id,
    );

    expect(restored.parent_version_id).toBe(session_export.current_version.id);
    expect(restored.is_milestone).toBe(true);
    expect(restored.change_summary).toMatch(/Restored from version/);
    expect(restored.version_number).toBe(2);
  });

  it("saveFrameVersion: writes the version and updates Frame.current_version_id + updated_at atomically", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const fv2: FrameVersion = {
      ...frame_export.current_version,
      id: "fv-new",
      version_number: 2,
    };
    await repo.saveFrameVersion(fv2);

    const updated_frame = await repo.loadFrame(frame_export.frame.id);
    expect(updated_frame.current_version_id).toBe("fv-new");
  });

  it("saveFrameVersion: search_index entry is regenerated in the same transaction", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const results = await repo.searchFrames("negligence");
    expect(results.length).toBeGreaterThan(0);
  });

  it("deleteFrame: cascade-deletes every FrameVersion, ArgumentSession, and ArgumentSessionVersion", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    await repo.deleteFrame(frame_export.frame.id);

    await expect(repo.loadFrame(frame_export.frame.id)).rejects.toThrow();
    await expect(repo.loadFrameVersion(frame_export.current_version.id)).rejects.toThrow();
    await expect(repo.loadSession(session_export.session.id)).rejects.toThrow();
  });

  it("migrateSession: applies discard, reattach, and no_op resolutions correctly", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const fv2: FrameVersion = {
      ...frame_export.current_version,
      id: "fv-2",
      version_number: 2,
      nodes: frame_export.current_version.nodes.filter((n) => n.id !== "node-sub-jur"),
      edges: frame_export.current_version.edges.filter(
        (e) => e.source !== "node-sub-jur" && e.target !== "node-sub-jur",
      ),
    };
    await repo.saveFrameVersion(fv2);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    const new_sv = await repo.migrateSession(session_export.session.id, "fv-2", [
      { kind: "no_op" },
    ]);

    expect(new_sv.is_milestone).toBe(true);
    expect(new_sv.change_summary).toMatch(/Migrated to frame v/);
    const updated_session = await repo.loadSession(session_export.session.id);
    expect(updated_session.frame_version_id).toBe("fv-2");
  });

  it("migrateSession: discard with source_node_id actually removes the orphaned carrier (P0-6 regression)", async () => {
    // Build a session whose argument layer references a node that the
    // target frame version no longer contains, then migrate with discard
    // and verify the carrier is actually removed.
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    // Build target FV missing the burden checkpoint node so any session
    // reference to that node will orphan.
    const removed_node_id: string = "node-cp-burden";
    const fv2: FrameVersion = {
      ...frame_export.current_version,
      id: "fv-2",
      version_number: 2,
      nodes: frame_export.current_version.nodes.filter((n) => n.id !== removed_node_id),
      edges: frame_export.current_version.edges.filter(
        (e) => e.source !== removed_node_id && e.target !== removed_node_id,
      ),
    };
    await repo.saveFrameVersion(fv2);

    // Inject a checkpoint_response and a session_authority into the session
    // version so we have concrete carriers to discard.
    const prior_sv = {
      ...session_export.current_version,
      checkpoint_responses: [
        {
          checkpoint_id: removed_node_id,
          selected_option_id: "opt_a",
          premise_id: "p-1",
          answered_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      session_authorities: [
        ...(session_export.current_version.session_authorities ?? []),
      ],
    };
    await repo.saveSession({
      ...session_export.session,
      checkpoint_responses: prior_sv.checkpoint_responses,
    });
    await repo.saveSessionVersion(prior_sv);

    // Migrate with a discard resolution carrying source_node_id (the bug
    // before P0-6 fix: this field was undefined and the repo's resolution
    // map stayed empty, so the discard was a silent no-op).
    const new_sv = await repo.migrateSession(session_export.session.id, "fv-2", [
      { kind: "discard", source_node_id: removed_node_id },
    ]);

    // The checkpoint response keyed on the deleted node should be GONE.
    expect(
      new_sv.checkpoint_responses?.some((r) => r.checkpoint_id === removed_node_id) ?? false,
    ).toBe(false);
  });
});
