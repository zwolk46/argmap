import { describe, it, expect } from "vitest";
import { createAppStateStore } from "@/state";
import { createAutosaveController } from "@/persistence";
import { freshDb, flushPromises, injectedNow } from "./_setup";

const TEST_NOW = "2026-05-13T00:00:00.000Z";

/**
 * Regression suite for P0-1: every AppState field must round-trip across a
 * fresh store instance. Before this fix, AppStateStore initialized with
 * DEFAULT_APP_STATE on every boot and only called loadAppState() in tests
 * — pinned frames, recents, coachmark dismissals, dismissed warnings,
 * output-view tab choices, seen new-feature notices, and side-panel state
 * all wiped on every page reload, even though saveAppState writes to disk.
 */
describe("AppStateStore — AppState round-trips across fresh store instances (P0-1)", () => {
  it("seeds DEFAULT_APP_STATE on first launch when the singleton is missing", async () => {
    const repo = await freshDb();
    const now = injectedNow(TEST_NOW);
    const autosave = createAutosaveController({ repo });
    const store = createAppStateStore({ repo, autosave, now });

    expect(store.getState().is_loaded).toBe(false);
    await store.getState().loadAppState();
    await flushPromises();

    expect(store.getState().is_loaded).toBe(true);
    expect(store.getState().error).toBeNull();
    expect(store.getState().app_state.recents).toEqual([]);
    expect(store.getState().app_state.pinned).toEqual([]);

    // The default was persisted, so a second load takes the fast path:
    const store2 = createAppStateStore({ repo, autosave, now });
    await store2.getState().loadAppState();
    await flushPromises();
    expect(store2.getState().is_loaded).toBe(true);
    expect(store2.getState().error).toBeNull();
  });

  it("preserves pinned, recents, coachmark_dismissals, dismissed_warnings, and output_view_tab_choice_by_frame across a fresh store instance", async () => {
    const repo = await freshDb();
    const now = injectedNow(TEST_NOW);
    const autosave = createAutosaveController({ repo });

    // Boot 1 — record everything the user could persist
    const store1 = createAppStateStore({ repo, autosave, now });
    await store1.getState().loadAppState();
    await flushPromises();

    store1.getState().pinFrame("fr-a", true);
    store1.getState().pinFrame("fr-b", true);
    store1.getState().setRecent("fr-c");
    store1.getState().setRecent("fr-d");
    store1.getState().dismissWarning("fr-a::V-FR-1::n1");
    store1.getState().dismissCoachmark("first_launch", true);
    store1.getState().markNewFeatureNoticeSeen("notice-1");
    store1.getState().setOutputViewTabChoice("fr-a", "decision_tree");

    await autosave.flushAll();

    // Boot 2 — fresh store, same repo
    const store2 = createAppStateStore({ repo, autosave, now });
    await store2.getState().loadAppState();
    await flushPromises();

    const reloaded = store2.getState().app_state;
    expect(reloaded.pinned).toEqual(["fr-a", "fr-b"]);
    expect(reloaded.recents).toEqual(["fr-d", "fr-c"]);
    expect(reloaded.dismissed_warnings?.["fr-a::V-FR-1::n1"]).toBe(true);
    expect(reloaded.coachmark_dismissals["first_launch"]).toBe(true);
    expect(reloaded.seen_new_feature_notices?.["notice-1"]).toBe(true);
    expect(reloaded.output_view_tab_choice_by_frame?.["fr-a"]).toBe("decision_tree");
    expect(store2.getState().is_loaded).toBe(true);
  });

  it("undismissWarning round-trips: dismiss, persist, fresh store, undismiss, persist, fresh store again", async () => {
    const repo = await freshDb();
    const now = injectedNow(TEST_NOW);
    const autosave = createAutosaveController({ repo });

    const s1 = createAppStateStore({ repo, autosave, now });
    await s1.getState().loadAppState();
    s1.getState().dismissWarning("first_launch");
    await autosave.flushAll();

    const s2 = createAppStateStore({ repo, autosave, now });
    await s2.getState().loadAppState();
    expect(s2.getState().app_state.dismissed_warnings?.["first_launch"]).toBe(true);
    s2.getState().undismissWarning("first_launch");
    await autosave.flushAll();

    const s3 = createAppStateStore({ repo, autosave, now });
    await s3.getState().loadAppState();
    expect(s3.getState().app_state.dismissed_warnings?.["first_launch"]).toBeUndefined();
  });

  it("is_loaded stays true even when loadAppState encounters an unexpected error", async () => {
    const repo = await freshDb();
    const now = injectedNow(TEST_NOW);
    const autosave = createAutosaveController({ repo });

    // Patch loadAppState to throw a non-"missing" error.
    const original_load = repo.loadAppState.bind(repo);
    repo.loadAppState = async () => {
      throw new Error("simulated transient error");
    };

    const store = createAppStateStore({ repo, autosave, now });
    await store.getState().loadAppState();
    await flushPromises();

    expect(store.getState().is_loaded).toBe(true);
    expect(store.getState().error).toBe("simulated transient error");

    // Restore for cleanup.
    repo.loadAppState = original_load;
  });
});
