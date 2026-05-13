import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { freshDb, flushPromises } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import { createAutosaveController, AUTOSAVE_IDLE_MS, type SaveEvent } from "@/persistence";
import type { IndexedDbRepository } from "@/persistence";

/**
 * P0-3 regression: a keystroke arriving during an in-flight flush used to be
 * dropped. The race:
 *  1. scheduleFrameSave(P1); 5s elapses; flushFrame begins, snapshots P1,
 *     clears timers, awaits saveFrameVersion.
 *  2. During the await, scheduleFrameSave(P2) lands. The slot's payload
 *     becomes P2 and a new idle_timer is armed.
 *  3. The original flush resolves successfully and calls
 *     `this.frame_slots.delete(id)`. The slot's freshly-armed idle_timer is
 *     orphaned: its callback finds no slot in the map and no-ops.
 *  4. P2 never persists.
 *
 * The fix: on successful flush, if a newer payload arrived during await,
 * reschedule instead of deleting.
 */
describe("autosave in-flight race (P0-3)", () => {
  let repo: IndexedDbRepository;

  beforeEach(async () => {
    repo = await freshDb();
  });
  afterEach(() => repo.close());

  it("a keystroke arriving during an in-flight FRAME flush is persisted, not dropped", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    // Wrap saveFrameVersion to introduce a 200ms in-flight window we can
    // hit precisely. The wrapper still forwards to the real saveFrameVersion.
    const real_save = repo.saveFrameVersion.bind(repo);
    let inflight_resolver: (() => void) | null = null;
    repo.saveFrameVersion = async (version) => {
      if (inflight_resolver) {
        // First call: hold open until we signal.
        await new Promise<void>((resolve) => {
          inflight_resolver = resolve;
        });
      }
      return real_save(version);
    };
    // Prime the resolver so the FIRST call holds; subsequent calls pass through.
    inflight_resolver = () => undefined;

    const controller = createAutosaveController({ repo });
    const succeeded: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => succeeded.push(e));

    const fv_a = { ...frame_export.current_version, id: "fv-a", version_number: 1 };
    const fv_b = { ...frame_export.current_version, id: "fv-b", version_number: 2 };

    // P1 arrives.
    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_a });

    // 5s idle elapses → flush starts → first saveFrameVersion call awaits.
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    // P2 arrives DURING the in-flight save.
    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_b });

    // Release the in-flight save so the first flush completes.
    inflight_resolver!();
    inflight_resolver = null;
    await flushPromises();

    // The reschedule should re-arm the idle timer at 5s.
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    expect(succeeded.map((e) => e.version_id)).toEqual(["fv-a", "fv-b"]);
    controller.dispose();
  });

  it("a keystroke arriving during an in-flight SESSION flush is persisted, not dropped", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);

    const real_save = repo.saveSessionVersion.bind(repo);
    let inflight_resolver: (() => void) | null = () => undefined;
    repo.saveSessionVersion = async (version) => {
      if (inflight_resolver) {
        await new Promise<void>((resolve) => {
          inflight_resolver = resolve;
        });
      }
      return real_save(version);
    };

    const controller = createAutosaveController({ repo });
    const succeeded: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => succeeded.push(e));

    const sv_a = { ...session_export.current_version, id: "sv-a", version_number: 1 };
    const sv_b = { ...session_export.current_version, id: "sv-b", version_number: 2 };

    controller.scheduleSessionSave({ session: session_export.session, new_version: sv_a });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    controller.scheduleSessionSave({ session: session_export.session, new_version: sv_b });

    inflight_resolver!();
    inflight_resolver = null;
    await flushPromises();

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    expect(succeeded.map((e) => e.version_id)).toEqual(["sv-a", "sv-b"]);
    controller.dispose();
  });
});
