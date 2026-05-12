import { describe, it, expect } from "vitest";
import { createSessionStore } from "@/state";
import { createComputeDriver } from "@/state";
import { createAutosaveController, createCrossTabBus } from "@/persistence";
import {
  freshDb,
  flushPromises,
  injectedNow,
  injectedGenerateId,
  makeSessionDispatch,
} from "./_setup";
import type { Premise } from "@/schema";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

async function makeEnv() {
  const repo = await freshDb();
  const now = injectedNow(TEST_NOW);
  const generateId = injectedGenerateId();

  // Create a frame + session in the DB
  const { frame, version: frame_version } = await repo.createBlankFrame({ title: "Test Frame" });
  await flushPromises();

  // Manually build a session + version and save them
  const session_id = "sess-1";
  const version_id = "sess-v-1";
  const ts = TEST_NOW;
  const session: import("@/schema").ArgumentSession = {
    id: session_id,
    frame_id: frame.id,
    frame_version_id: frame_version.id,
    frame_version_snapshot: frame_version,
    title: "Test Session",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: ts,
    updated_at: ts,
    current_version_id: version_id,
  };
  const session_version: import("@/schema").ArgumentSessionVersion = {
    id: version_id,
    session_id,
    version_number: 1,
    created_at: ts,
    is_milestone: true,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
  };
  await repo.saveSession(session);
  await repo.saveSessionVersion(session_version);
  await flushPromises();

  const autosave = createAutosaveController({ repo });
  const crosstab = createCrossTabBus();
  const compute_driver = createComputeDriver({ now: () => TEST_NOW });
  const dispatch = makeSessionDispatch();

  const store = createSessionStore({
    repo,
    autosave,
    crosstab,
    dispatch,
    compute_driver,
    now,
    generateId,
  });

  return { repo, store, frame, frame_version, session, session_version, autosave };
}

// AT-STATE-SS-1: loadSession calls repo and runs compute
describe("SessionStore.loadSession", () => {
  it("loads session and version, runs compute", async () => {
    const { store, session } = await makeEnv();
    await store.getState().loadSession(session.id);
    await flushPromises();

    const state = store.getState();
    expect(state.session?.id).toBe(session.id);
    expect(state.session_version).toBeDefined();
    expect(state.compute_result).toBeDefined();
    expect(state.is_loading).toBe(false);
    store.getState().dispose();
  });

  it("sets error on invalid session id", async () => {
    const { store } = await makeEnv();
    await store.getState().loadSession("nonexistent");
    await flushPromises();

    expect(store.getState().error).toBeTruthy();
    store.getState().dispose();
  });
});

describe("SessionStore.loadSessionsForFrame", () => {
  it("populates sessions_list", async () => {
    const { store, frame } = await makeEnv();
    await store.getState().loadSessionsForFrame(frame.id);
    await flushPromises();

    expect(store.getState().sessions_list.length).toBeGreaterThan(0);
    store.getState().dispose();
  });
});

// AT-STATE-SS-2: session patch updates compute_result
describe("SessionStore.applyPatch", () => {
  it("premise_added updates session.premises", async () => {
    const { store, session } = await makeEnv();
    await store.getState().loadSession(session.id);
    await flushPromises();

    const premise: Premise = {
      id: "p-1",
      type: "Premise",
      layer: "argument",
      statement: "A test premise",
      kind: "empirical",
      created_at: TEST_NOW,
      updated_at: TEST_NOW,
    };
    store.getState().applyPatch({ kind: "premise_added", premise });

    const state = store.getState();
    expect(state.session?.premises).toHaveLength(1);
    expect(state.compute_result).toBeDefined();
    store.getState().dispose();
  });

  it("updates version_number after patch", async () => {
    const { store, session } = await makeEnv();
    await store.getState().loadSession(session.id);
    await flushPromises();

    const initial = store.getState().session_version?.version_number ?? 0;
    store.getState().applyPatch({ kind: "output_overrides_cleared" });

    expect(store.getState().session_version?.version_number).toBe(initial + 1);
    store.getState().dispose();
  });

  it("does nothing when no session is loaded", async () => {
    const { store } = await makeEnv();
    store.getState().applyPatch({ kind: "output_overrides_cleared" });
    expect(store.getState().session).toBeNull();
    store.getState().dispose();
  });
});

describe("SessionStore.previewMigration", () => {
  it("returns orphan candidates array", async () => {
    const { store, session, frame_version } = await makeEnv();
    await store.getState().loadSession(session.id);
    await flushPromises();

    const orphans = await store.getState().previewMigration(frame_version.id);
    expect(Array.isArray(orphans)).toBe(true);
    store.getState().dispose();
  });

  it("returns empty array when no session loaded", async () => {
    const { store, frame_version } = await makeEnv();
    const orphans = await store.getState().previewMigration(frame_version.id);
    expect(orphans).toHaveLength(0);
    store.getState().dispose();
  });
});
