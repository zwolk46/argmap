import { describe, it, expect } from "vitest";
import { createAppStateStore } from "@/state";
import { createAutosaveController } from "@/persistence";
import { freshDb, flushPromises, injectedNow } from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

async function makeEnv() {
  const repo = await freshDb();
  const now = injectedNow(TEST_NOW);
  const autosave = createAutosaveController({ repo });
  const store = createAppStateStore({ repo, autosave, now });
  return { repo, store, autosave };
}

// AT-STATE-AS-1: loadAppState and loadFrames
describe("AppStateStore.loadAppState", () => {
  it("loads app state from repo", async () => {
    const { store } = await makeEnv();
    await store.getState().loadAppState();
    await flushPromises();

    const state = store.getState();
    expect(state.app_state).toBeDefined();
    expect(state.is_loading).toBe(false);
    expect(Array.isArray(state.app_state.recents)).toBe(true);
    store.getState().dispose();
  });
});

describe("AppStateStore.loadFrames", () => {
  it("returns empty list initially", async () => {
    const { store } = await makeEnv();
    await store.getState().loadFrames();
    await flushPromises();

    expect(store.getState().frames).toHaveLength(0);
    store.getState().dispose();
  });
});

// AT-STATE-AS-1: createFrame adds to frames list
describe("AppStateStore.createFrame", () => {
  it("creates a blank frame and refreshes frames list", async () => {
    const { store } = await makeEnv();

    const result = await store.getState().createFrame({ title: "New Frame", mode: "general" });
    await flushPromises();

    expect(result.frame.title).toBe("New Frame");
    expect(result.frame.mode).toBe("general");
    expect(store.getState().frames.some((f) => f.id === result.frame.id)).toBe(true);
    store.getState().dispose();
  });

  it("creates frame with legal mode", async () => {
    const { store } = await makeEnv();
    const result = await store.getState().createFrame({ title: "Legal Frame", mode: "legal" });
    await flushPromises();

    expect(result.frame.mode).toBe("legal");
    store.getState().dispose();
  });
});

// AT-STATE-AS-2: deleteFrame removes from list
describe("AppStateStore.deleteFrame", () => {
  it("deletes frame and refreshes list", async () => {
    const { store } = await makeEnv();
    const { frame } = await store.getState().createFrame({ title: "To Delete" });
    await flushPromises();

    expect(store.getState().frames.some((f) => f.id === frame.id)).toBe(true);

    await store.getState().deleteFrame(frame.id);
    await flushPromises();

    expect(store.getState().frames.some((f) => f.id === frame.id)).toBe(false);
    store.getState().dispose();
  });

  it("removes deleted frame from recents and pinned", async () => {
    const { store } = await makeEnv();
    const { frame } = await store.getState().createFrame({ title: "Pinned Frame" });
    await flushPromises();

    store.getState().pinFrame(frame.id, true);
    store.getState().setRecent(frame.id);

    expect(store.getState().app_state.pinned.includes(frame.id)).toBe(true);
    expect(store.getState().app_state.recents.includes(frame.id)).toBe(true);

    await store.getState().deleteFrame(frame.id);
    await flushPromises();

    expect(store.getState().app_state.pinned.includes(frame.id)).toBe(false);
    expect(store.getState().app_state.recents.includes(frame.id)).toBe(false);
    store.getState().dispose();
  });
});

describe("AppStateStore preferences", () => {
  it("pinFrame adds/removes from pinned list", async () => {
    const { store } = await makeEnv();
    store.getState().pinFrame("fr-1", true);
    expect(store.getState().app_state.pinned).toContain("fr-1");

    store.getState().pinFrame("fr-1", false);
    expect(store.getState().app_state.pinned).not.toContain("fr-1");
    store.getState().dispose();
  });

  it("setRecent adds to recents and deduplicates", async () => {
    const { store } = await makeEnv();
    store.getState().setRecent("fr-a");
    store.getState().setRecent("fr-b");
    store.getState().setRecent("fr-a");

    const recents = store.getState().app_state.recents;
    expect(recents[0]).toBe("fr-a");
    expect(recents.filter((r) => r === "fr-a")).toHaveLength(1);
    store.getState().dispose();
  });

  it("dismissWarning sets the warning id", async () => {
    const { store } = await makeEnv();
    store.getState().dismissWarning("first_launch");
    expect(store.getState().app_state.dismissed_warnings?.["first_launch"]).toBe(true);
    store.getState().dispose();
  });

  it("resetCoachmarks empties coachmark_dismissals", async () => {
    const { store } = await makeEnv();
    store.setState({
      app_state: {
        ...store.getState().app_state,
        coachmark_dismissals: { intro_tour: true },
      },
    });
    store.getState().resetCoachmarks();
    expect(Object.keys(store.getState().app_state.coachmark_dismissals)).toHaveLength(0);
    store.getState().dispose();
  });

  it("markNewFeatureNoticeSeen records the feature", async () => {
    const { store } = await makeEnv();
    store.getState().markNewFeatureNoticeSeen("v2-export");
    expect(store.getState().app_state.seen_new_feature_notices?.["v2-export"]).toBe(true);
    store.getState().dispose();
  });

  it("setOutputViewTabChoice records per-frame tab", async () => {
    const { store } = await makeEnv();
    store.getState().setOutputViewTabChoice("fr-1", "prose");
    expect(store.getState().app_state.output_view_tab_choice_by_frame?.["fr-1"]).toBe("prose");
    store.getState().dispose();
  });
});
