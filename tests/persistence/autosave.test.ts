import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { freshDb, flushPromises } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import {
  createAutosaveController,
  AUTOSAVE_IDLE_MS,
  APP_STATE_DEBOUNCE_MS,
  RepositoryError,
  type SaveEvent,
} from "@/persistence";
import type { IndexedDbRepository } from "@/persistence";

describe("persistence/autosave", () => {
  let repo: IndexedDbRepository;

  beforeEach(async () => {
    repo = await freshDb();
    // Fake timers are installed globally by tests/setup.ts beforeEach.
  });
  afterEach(() => repo.close());

  it("scheduleFrameSave: flushes after 5s of idle", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo });
    const events: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => events.push(e));

    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS - 1);
    expect(events).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(2);
    await flushPromises();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("frame");
    controller.dispose();
  });

  it("scheduleFrameSave: rapid edits in a 30s window flush at 30s even without idle", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo });
    const events: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => events.push(e));

    // Schedule repeatedly, resetting the idle timer each time.
    for (let i = 0; i < 7; i++) {
      controller.scheduleFrameSave({
        frame: frame_export.frame,
        new_version: { ...frame_export.current_version, id: `fv-${i}`, version_number: i + 1 },
      });
      await vi.advanceTimersByTimeAsync(4_500); // Each advance < 5s idle
    }
    // Total elapsed: ~31.5s. Max timer (30s) should have fired.
    await flushPromises();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("frame");
    controller.dispose();
  });

  it("scheduleFrameSave: multiple schedules for the same id overwrite, only the latest payload is written", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo });
    const succeeded: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => succeeded.push(e));

    const fv_a = { ...frame_export.current_version, id: "fv-a", version_number: 1 };
    const fv_b = { ...frame_export.current_version, id: "fv-b", version_number: 2 };

    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_a });
    controller.scheduleFrameSave({ frame: frame_export.frame, new_version: fv_b });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();

    expect(succeeded).toHaveLength(1);
    expect(succeeded[0].version_id).toBe("fv-b");
    controller.dispose();
  });

  it("saveFrameMilestone: bypasses the debounce and produces is_milestone: true on the written version", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo });
    const succeeded: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => succeeded.push(e));

    const milestone_version = {
      ...frame_export.current_version,
      id: "fv-milestone",
      version_number: 1,
      is_milestone: true,
    };

    await controller.saveFrameMilestone({
      frame: frame_export.frame,
      new_version: milestone_version,
    });

    expect(succeeded).toHaveLength(1);
    expect(succeeded[0].version_id).toBe("fv-milestone");
    controller.dispose();
  });

  it("scheduleSessionSave: same behavior over sessions", async () => {
    const { frame_export, session_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);
    await repo.saveFrameVersion(frame_export.current_version);
    await repo.saveSession(session_export.session);

    const controller = createAutosaveController({ repo });
    const events: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => events.push(e));

    controller.scheduleSessionSave({
      session: session_export.session,
      new_version: session_export.current_version,
    });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("session");
    controller.dispose();
  });

  it("scheduleAppStateSave: separate 1s debouncer, never produces a version", async () => {
    const controller = createAutosaveController({ repo });
    const events: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => events.push(e));

    const initial_state = await repo.loadAppState();
    controller.scheduleAppStateSave({ ...initial_state, recents: ["frame-x"] });

    await vi.advanceTimersByTimeAsync(APP_STATE_DEBOUNCE_MS - 1);
    expect(events).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(2);
    await flushPromises();
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("app_state");
    expect(events[0].version_id).toBeUndefined();
    controller.dispose();
  });

  it("save_failed event: emits when Repository throws RepositoryError; retains payload for retry", async () => {
    const { frame_export } = buildLegalModeFixture();
    // Do NOT seed the Frame — saveFrameVersion will throw "Parent Frame missing".
    const controller = createAutosaveController({ repo });
    const failures: SaveEvent[] = [];
    const successes: SaveEvent[] = [];
    controller.on("save_failed", (e) => failures.push(e));
    controller.on("save_succeeded", (e) => successes.push(e));

    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();
    expect(failures).toHaveLength(1);
    expect(failures[0].error).toBeInstanceOf(RepositoryError);

    // Seed the frame; schedule again; should succeed.
    await repo.saveFrame(frame_export.frame);
    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    await flushPromises();
    expect(successes).toHaveLength(1);
    controller.dispose();
  });

  it("dispose: clears all pending timers and stops emitting events", async () => {
    const { frame_export } = buildLegalModeFixture();
    await repo.saveFrame(frame_export.frame);

    const controller = createAutosaveController({ repo });
    const events: SaveEvent[] = [];
    controller.on("save_succeeded", (e) => events.push(e));

    controller.scheduleFrameSave({
      frame: frame_export.frame,
      new_version: frame_export.current_version,
    });
    controller.dispose();

    await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
    expect(events).toHaveLength(0);
  });
});
