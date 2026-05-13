import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAppStateStore, createFrameStore, createSessionStore } from "@/state";
import { createAutosaveController, createCrossTabBus } from "@/persistence";
import {
  freshDb,
  flushPromises,
  injectedNow,
  injectedGenerateId,
  makeFrameDispatch,
  makeSessionDispatch,
} from "./_setup";
import { createComputeDriver } from "@/state/compute-driver";

// BroadcastChannel under happy-dom is event-loop-driven. We restore real
// timers briefly to drain dispatch.
async function flushMessages(): Promise<void> {
  vi.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 10));
}

const T = "2026-05-13T00:00:00.000Z";

describe("cross-tab broadcast wire-up (P0-2 + P0-5)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(T).getTime() });
  });

  it("two AppStateStore instances on the same channel see each other's deleteFrame", async () => {
    const channel = "test_cross_tab_" + Date.now() + "_" + Math.random();
    const repo = await freshDb();
    const bus_a = createCrossTabBus(channel);
    const bus_b = createCrossTabBus(channel);
    const autosave_a = createAutosaveController({ repo, crosstab: bus_a });
    const autosave_b = createAutosaveController({ repo, crosstab: bus_b });
    const now_a = injectedNow(T);
    const now_b = injectedNow(T);

    const store_a = createAppStateStore({
      repo,
      autosave: autosave_a,
      crosstab: bus_a,
      now: now_a,
    });
    const store_b = createAppStateStore({
      repo,
      autosave: autosave_b,
      crosstab: bus_b,
      now: now_b,
    });

    await store_a.getState().loadAppState();
    await store_b.getState().loadAppState();

    // Both tabs see the same frame in recents (simulating they each opened it).
    const result = await store_a.getState().createFrame({ title: "to delete", mode: "general" });
    const frame_id = result.frame.id;
    store_a.getState().setRecent(frame_id);
    store_b.getState().setRecent(frame_id);
    await flushPromises();
    expect(store_b.getState().app_state.recents).toContain(frame_id);

    // Tab A deletes the frame. Bus publishes frame_deleted; Tab B's
    // subscription drops it from in-memory recents/pinned.
    await store_a.getState().deleteFrame(frame_id);
    await flushPromises();
    await flushMessages();
    await flushPromises();

    expect(store_b.getState().app_state.recents).not.toContain(frame_id);
    store_a.getState().dispose();
    store_b.getState().dispose();
    bus_a.close();
    bus_b.close();
  });

  it("noop when crosstab is omitted (back-compat)", async () => {
    const repo = await freshDb();
    const autosave = createAutosaveController({ repo });
    const now = injectedNow(T);
    // No crosstab passed.
    const store = createAppStateStore({ repo, autosave, now });
    await store.getState().loadAppState();
    // dispose must not throw even though no unsub functions were registered.
    expect(() => store.getState().dispose()).not.toThrow();
  });

  it("FrameStore refreshes when a peer publishes frame_saved for the open frame", async () => {
    const channel = "test_frame_saved_" + Date.now() + "_" + Math.random();
    const repo = await freshDb();
    const bus_a = createCrossTabBus(channel);
    const bus_b = createCrossTabBus(channel);
    const autosave_a = createAutosaveController({ repo, crosstab: bus_a });
    const autosave_b = createAutosaveController({ repo, crosstab: bus_b });
    const now_a = injectedNow(T);
    const now_b = injectedNow(T);
    const compute_a = createComputeDriver({ now: now_a });
    const compute_b = createComputeDriver({ now: now_b });
    const dispatch = makeFrameDispatch();
    const store_a = createFrameStore({
      repo,
      autosave: autosave_a,
      crosstab: bus_a,
      dispatch,
      compute_driver: compute_a,
      now: now_a,
      generateId: injectedGenerateId(),
    });
    const store_b = createFrameStore({
      repo,
      autosave: autosave_b,
      crosstab: bus_b,
      dispatch,
      compute_driver: compute_b,
      now: now_b,
      generateId: injectedGenerateId(),
    });

    // Create a frame via the repository directly (we just need a target id).
    const { frame, version } = await repo.createBlankFrame({ title: "test", mode: "general" });
    await store_a.getState().loadFrame(frame.id);
    await store_b.getState().loadFrame(frame.id);
    await flushPromises();

    expect(store_a.getState().frame?.id).toBe(frame.id);
    expect(store_b.getState().frame?.id).toBe(frame.id);

    // Publish a frame_saved event from bus_a as if tab A just saved a new
    // version. Bus_b's frame_store subscription should kick a reload.
    const next_version = { ...version, id: "fv-new" };
    await repo.saveFrameVersion(next_version);
    bus_a.publish("frame_saved", { frame_id: frame.id, version_id: "fv-new" });
    await flushMessages();
    await flushPromises();

    // Store B should have loaded the new version (or at least kicked a load).
    expect(store_b.getState().frame_version?.id).toBe("fv-new");

    store_a.getState().dispose();
    store_b.getState().dispose();
    bus_a.close();
    bus_b.close();
  });

  it("when a peer publishes frame_deleted, FrameStore on the deleted frame nulls its snapshot", async () => {
    const channel = "test_frame_deleted_" + Date.now() + "_" + Math.random();
    const repo = await freshDb();
    const bus_a = createCrossTabBus(channel);
    const bus_b = createCrossTabBus(channel);
    const autosave_b = createAutosaveController({ repo, crosstab: bus_b });
    const compute_b = createComputeDriver({ now: injectedNow(T) });
    const store_b = createFrameStore({
      repo,
      autosave: autosave_b,
      crosstab: bus_b,
      dispatch: makeFrameDispatch(),
      compute_driver: compute_b,
      now: injectedNow(T),
      generateId: injectedGenerateId(),
    });

    const { frame } = await repo.createBlankFrame({ title: "to delete", mode: "general" });
    await store_b.getState().loadFrame(frame.id);
    await flushPromises();

    expect(store_b.getState().frame).not.toBeNull();

    bus_a.publish("frame_deleted", { frame_id: frame.id });
    await flushMessages();
    await flushPromises();

    expect(store_b.getState().frame).toBeNull();
    expect(store_b.getState().error).toMatch(/deleted in another tab/);

    store_b.getState().dispose();
    bus_a.close();
    bus_b.close();
  });

  it("SessionStore drops its session when the parent frame is deleted by a peer", async () => {
    const channel = "test_parent_frame_deleted_" + Date.now() + "_" + Math.random();
    const repo = await freshDb();
    const bus_a = createCrossTabBus(channel);
    const bus_b = createCrossTabBus(channel);
    const autosave_b = createAutosaveController({ repo, crosstab: bus_b });
    const compute_b = createComputeDriver({ now: injectedNow(T) });

    const { frame } = await repo.createBlankFrame({ title: "p", mode: "general" });
    // Build a session record so we can put it into the store.
    const session = {
      id: "s-1",
      frame_id: frame.id,
      frame_version_id: frame.current_version_id,
      frame_version_snapshot: await repo.loadFrameVersion(frame.current_version_id),
      title: "session",
      premises: [],
      argument_edges: [],
      checkpoint_responses: [],
      interpretation_selections: [],
      status_map: {},
      created_at: T,
      updated_at: T,
      current_version_id: "sv-1",
    };
    await repo.saveSession(session);
    // saveSessionVersion is required so loadSession's downstream
    // loadSessionVersion(current_version_id) call resolves.
    await repo.saveSessionVersion({
      id: "sv-1",
      session_id: "s-1",
      version_number: 1,
      created_at: T,
      is_milestone: false,
      premises: [],
      argument_edges: [],
      checkpoint_responses: [],
      interpretation_selections: [],
    });

    const store = createSessionStore({
      repo,
      autosave: autosave_b,
      crosstab: bus_b,
      dispatch: makeSessionDispatch(),
      compute_driver: compute_b,
      now: injectedNow(T),
      generateId: injectedGenerateId(),
    });
    await store.getState().loadSession(session.id);
    await flushPromises();
    expect(store.getState().session?.id).toBe(session.id);

    // Peer deletes parent frame.
    bus_a.publish("frame_deleted", { frame_id: frame.id });
    await flushMessages();
    await flushPromises();

    expect(store.getState().session).toBeNull();
    expect(store.getState().error).toMatch(/parent frame was deleted/);

    store.getState().dispose();
    bus_a.close();
    bus_b.close();
  });
});
