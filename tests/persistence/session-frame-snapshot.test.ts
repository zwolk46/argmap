// §8 #1: ArgumentSessionVersion.frame_version_snapshot — guarantee that
// every session-version write captures the frame it was authored against,
// so version-history preview renders the historical frame, not the live one.
// Without this, replaying the same session_version_id after a migration
// shows different content (audit 08-version-history.md CRITICAL #1; also
// breaks Article II §2 Determinism for preview replay).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshDb } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import type { IndexedDbRepository } from "@/persistence";
import type { FrameVersion } from "@/schema";

describe("ArgumentSessionVersion.frame_version_snapshot (§8 #1)", () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("saveSessionVersion backfills snapshot from the parent session when caller omits it", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    // The fixture's session_version intentionally has no frame_version_snapshot
    // (simulating legacy persisted rows). The backfill should populate it.
    expect(session_export.current_version.frame_version_snapshot).toBeUndefined();
    await repo.saveSessionVersion(session_export.current_version);

    const loaded = await repo.loadSessionVersion(session_export.current_version.id);
    expect(loaded.frame_version_snapshot).toBeDefined();
    expect(loaded.frame_version_snapshot?.id).toBe(frame_export.current_version.id);
  });

  it("migrateSession snapshots the target frame_version on the new session-version", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    // Build a second frame_version on the same frame, then migrate the session.
    const fv2: FrameVersion = {
      ...frame_export.current_version,
      id: "fv-2",
      version_number: 2,
      parent_version_id: frame_export.current_version.id,
    };
    await repo.saveFrameVersion(fv2);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    const new_sv = await repo.migrateSession(session_export.session.id, "fv-2", [
      { kind: "no_op" },
    ]);

    expect(new_sv.frame_version_snapshot).toBeDefined();
    expect(new_sv.frame_version_snapshot?.id).toBe("fv-2");
    expect(new_sv.frame_version_snapshot?.version_number).toBe(2);
  });

  it("restoreSessionVersion snapshots the live session's current frame, not the ancestor's", async () => {
    // Restore replays the ancestor's premises into a new head that lives in
    // the current frame context — the live session's frame_version_id is
    // unchanged by restore. So the new version's snapshot should match the
    // live session's snapshot, not the (possibly older) ancestor's snapshot.
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);

    // Migrate the session to a new frame version so its live snapshot differs
    // from the ancestor session_version we will restore from.
    const fv2: FrameVersion = {
      ...frame_export.current_version,
      id: "fv-2",
      version_number: 2,
      parent_version_id: frame_export.current_version.id,
    };
    await repo.saveFrameVersion(fv2);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);
    await repo.migrateSession(session_export.session.id, "fv-2", [{ kind: "no_op" }]);

    // Now restore the original session_version. The new "head" version should
    // snapshot fv-2 (the live frame), not the original fv-1.
    const restored = await repo.restoreSessionVersion(
      session_export.session.id,
      session_export.current_version.id,
    );
    expect(restored.frame_version_snapshot).toBeDefined();
    expect(restored.frame_version_snapshot?.id).toBe("fv-2");
  });

  it("snapshot survives a load + save round trip without mutation", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);
    await repo.saveSessionVersion(session_export.current_version);

    const loaded = await repo.loadSessionVersion(session_export.current_version.id);
    const snap_before = loaded.frame_version_snapshot;
    expect(snap_before).toBeDefined();

    // Re-save the loaded payload (e.g., a milestone re-mark in a peer tab).
    await repo.saveSessionVersion(loaded);
    const loaded_again = await repo.loadSessionVersion(session_export.current_version.id);
    expect(loaded_again.frame_version_snapshot?.id).toBe(snap_before?.id);
    expect(loaded_again.frame_version_snapshot?.version_number).toBe(snap_before?.version_number);
  });
});
