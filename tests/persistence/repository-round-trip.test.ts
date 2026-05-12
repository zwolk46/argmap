import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshDb } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import type { IndexedDbRepository } from "@/persistence";

describe("persistence/round-trip", () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("saves and loads a Frame + FrameVersion", async () => {
    const { frame_export } = buildLegalModeFixture();
    const { frame, current_version } = frame_export;
    await repo.saveFrame(frame);
    await repo.saveFrameVersion(current_version);
    const loaded_frame = await repo.loadFrame(frame.id);
    const loaded_version = await repo.loadFrameVersion(current_version.id);
    expect(loaded_frame.id).toBe(frame.id);
    expect(loaded_version.id).toBe(current_version.id);
    expect(loaded_version.nodes).toStrictEqual(current_version.nodes);
    expect(loaded_version.edges).toStrictEqual(current_version.edges);
  });

  it("saveFrameVersion throws RepositoryError when the parent Frame is missing", async () => {
    const { frame_export } = buildLegalModeFixture();
    await expect(repo.saveFrameVersion(frame_export.current_version)).rejects.toThrow(
      /Parent Frame missing/,
    );
  });

  it("listFrames returns a FrameSummary for every saved Frame", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    const summaries = await repo.listFrames();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe(frame_export.frame.id);
    expect(summaries[0].title).toBe(frame_export.frame.title);
  });

  it("export → import round-trips a Frame with full history", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    const exported = await repo.exportFrame(frame_export.frame.id, { include_history: true });
    const repo2 = await freshDb("import_target");
    const imported_frame = await repo2.importFrame(exported);
    const loaded = await repo2.loadFrameVersion(imported_frame.current_version_id);
    expect(loaded.nodes).toStrictEqual(frame_export.current_version.nodes);
    repo2.close();
  });

  it("export → import round-trips an ArgumentSession with embedded frame", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);
    const exported = await repo.exportSession(session_export.session.id, {
      include_frame: true,
      include_history: false,
    });
    const repo2 = await freshDb("import_session_target");
    const imported = await repo2.importSession(exported);
    expect(imported.id).toBe(session_export.session.id);
    const loaded_session = await repo2.loadSession(imported.id);
    expect(loaded_session.frame_id).toBe(frame_export.frame.id);
    repo2.close();
  });

  it("a session whose underlying frame has moved forward reports drift_warning", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);

    // Create a new FrameVersion and advance the frame pointer.
    const new_fv = { ...frame_export.current_version, id: "fv-2", version_number: 2 };
    await repo.saveFrameVersion(new_fv);

    const summaries = await repo.listSessionsForFrame(frame_export.frame.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].frame_version_drift_warning).toBeDefined();
    expect(summaries[0].frame_version_drift_warning).toMatch(/moved forward/);
  });

  it("saves and loads AppState round-trip", async () => {
    const loaded = await repo.loadAppState();
    expect(loaded.recents).toStrictEqual([]);
    expect(loaded.side_panel_collapsed).toStrictEqual({});
    expect(loaded.default_output_view).toBe("path_overlay");

    const updated = { ...loaded, recents: ["frame-1"] };
    await repo.saveAppState(updated);
    const reloaded = await repo.loadAppState();
    expect(reloaded.recents).toStrictEqual(["frame-1"]);
  });

  it("deleteFrame removes frame, versions, sessions, and search index", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    await repo.deleteFrame(frame_export.frame.id);

    await expect(repo.loadFrame(frame_export.frame.id)).rejects.toThrow(/Frame not found/);
    const sessions = await repo.listSessionsForFrame(frame_export.frame.id);
    expect(sessions).toHaveLength(0);
    const search_results = await repo.searchFrames("negligence");
    expect(search_results).toHaveLength(0);
  });
});
