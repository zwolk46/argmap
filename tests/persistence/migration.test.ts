import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshDb } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import { CURRENT_SCHEMA_VERSION } from "@/schema";
import type { IndexedDbRepository } from "@/persistence";

describe("persistence/migration", () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("openOrUpgrade: a fresh database initializes AppState with last_known_schema_version = CURRENT_SCHEMA_VERSION", async () => {
    const state = await repo.loadAppState();
    expect(state.last_known_schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("CURRENT_SCHEMA_VERSION is 1 at v1", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it("openOrUpgrade: AppState defaults are set correctly", async () => {
    const state = await repo.loadAppState();
    expect(state.recents).toStrictEqual([]);
    expect(state.pinned).toStrictEqual([]);
    expect(state.default_output_view).toBe("path_overlay");
    expect(state.side_panel_collapsed).toStrictEqual({});
    expect(state.coachmark_dismissals).toStrictEqual({});
  });

  it("applySchemaMigrationSweep: pure under empty registry — records unchanged", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    const loaded = await repo.loadFrame(frame_export.frame.id);
    const version = await repo.loadFrameVersion(frame_export.current_version.id);

    expect(loaded.id).toBe(frame_export.frame.id);
    expect(version.nodes).toStrictEqual(frame_export.current_version.nodes);
  });

  it("importFrame: writes records inside one transaction; frame is loadable after import", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.importFrame(frame_export);

    const loaded = await repo.loadFrame(frame_export.frame.id);
    expect(loaded.id).toBe(frame_export.frame.id);
    const loaded_version = await repo.loadFrameVersion(frame_export.current_version.id);
    expect(loaded_version.nodes).toStrictEqual(frame_export.current_version.nodes);
  });

  it("importSession: imports session with embedded frame in a single operation", async () => {
    const { session_export } = buildLegalModeFixture();
    const imported = await repo.importSession(session_export);
    expect(imported.id).toBe(session_export.session.id);
    const loaded_frame = await repo.loadFrame(session_export.session.frame_id);
    expect(loaded_frame.id).toBe(session_export.session.frame_id);
  });
});
