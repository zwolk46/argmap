import { describe, it, expect, vi } from "vitest";
import { createFrameStore } from "@/state";
import { createComputeDriver } from "@/state";
import { createAutosaveController } from "@/persistence";
import { createCrossTabBus } from "@/persistence";
import {
  makeFrameDispatch,
  makeNode,
  freshDb,
  flushPromises,
  injectedNow,
  injectedGenerateId,
} from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

async function makeEnv() {
  const repo = await freshDb();
  const now = injectedNow(TEST_NOW);
  const generateId = injectedGenerateId();

  const { frame, version } = await repo.createBlankFrame({ title: "Test Frame" });
  const autosave = createAutosaveController({ repo });
  const crosstab = createCrossTabBus();
  const compute_driver = createComputeDriver({ now: () => TEST_NOW });
  const dispatch = makeFrameDispatch({
    node_added: (_fr, fv, patch, _opts) => ({
      next_version: { ...fv, nodes: [...fv.nodes, patch.node] },
    }),
  });

  const store = createFrameStore({
    repo,
    autosave,
    crosstab,
    dispatch,
    compute_driver,
    now,
    generateId,
  });

  return { repo, store, frame, version, autosave, crosstab, now, generateId };
}

// AT-STATE-FS-1: loadFrame calls repo and sets state
describe("FrameStore.loadFrame", () => {
  it("loads frame and version from repo", async () => {
    const { store, frame } = await makeEnv();
    await store.getState().loadFrame(frame.id);
    await flushPromises();

    const state = store.getState();
    expect(state.frame?.id).toBe(frame.id);
    expect(state.frame_version).toBeDefined();
    expect(state.is_loading).toBe(false);
    expect(state.error).toBeNull();
    store.getState().dispose();
  });

  it("sets error state when frame id is invalid", async () => {
    const { store } = await makeEnv();
    await store.getState().loadFrame("nonexistent-id");
    await flushPromises();

    const state = store.getState();
    expect(state.error).toBeTruthy();
    expect(state.is_loading).toBe(false);
    store.getState().dispose();
  });
});

// AT-STATE-FS-2: applyPatch updates frame state and schedules autosave
describe("FrameStore.applyPatch", () => {
  it("node_added patch adds node to frame_version", async () => {
    const { store, frame } = await makeEnv();
    await store.getState().loadFrame(frame.id);
    await flushPromises();

    const node = makeNode("new-node-1");
    store.getState().applyPatch({ kind: "node_added", node });

    const state = store.getState();
    expect(state.frame_version?.nodes).toHaveLength(1);
    expect(state.frame_version?.nodes[0]?.id).toBe("new-node-1");
    store.getState().dispose();
  });

  it("increments version_number after patch", async () => {
    const { store, frame } = await makeEnv();
    await store.getState().loadFrame(frame.id);
    await flushPromises();

    const initial_version_number = store.getState().frame_version?.version_number ?? 0;
    store.getState().applyPatch({ kind: "presentation_hints_reset_all" });

    expect(store.getState().frame_version?.version_number).toBe(initial_version_number + 1);
    store.getState().dispose();
  });

  it("does nothing when frame is not loaded", async () => {
    const { store } = await makeEnv();
    // frame not loaded, applyPatch should be a no-op
    store.getState().applyPatch({ kind: "presentation_hints_reset_all" });
    expect(store.getState().frame_version).toBeNull();
    store.getState().dispose();
  });

  it("schedules autosave after patch", async () => {
    const { store, frame, autosave } = await makeEnv();
    await store.getState().loadFrame(frame.id);
    await flushPromises();

    const scheduleFrameSaveSpy = vi.spyOn(autosave, "scheduleFrameSave");
    store.getState().applyPatch({ kind: "presentation_hints_reset_all" });

    expect(scheduleFrameSaveSpy).toHaveBeenCalledOnce();
    store.getState().dispose();
  });
});

describe("FrameStore.saveFrameMilestone", () => {
  it("calls autosave.saveFrameMilestone with is_milestone true", async () => {
    const { store, frame, autosave } = await makeEnv();
    await store.getState().loadFrame(frame.id);
    await flushPromises();

    const saveMilestoneSpy = vi.spyOn(autosave, "saveFrameMilestone").mockResolvedValue(undefined);
    await store.getState().saveFrameMilestone("manual save");

    expect(saveMilestoneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        new_version: expect.objectContaining({ is_milestone: true }),
      }),
    );
    store.getState().dispose();
  });

  it("does nothing when no frame is loaded", async () => {
    const { store, autosave } = await makeEnv();
    const spy = vi.spyOn(autosave, "saveFrameMilestone");
    await store.getState().saveFrameMilestone();
    expect(spy).not.toHaveBeenCalled();
    store.getState().dispose();
  });
});

// §12 F-18: drawer needs a synchronous preview of hook.commit() before
// the user clicks Accept. State doesn't import @/llm-hooks (boundary), so
// the preview implementation is injected as a store opt.
describe("FrameStore.previewCommit (§12 F-18)", () => {
  it("returns null when no pending suggestion", async () => {
    const { store } = await makeEnv();
    expect(store.getState().previewCommit({ kind: "accepted", final: {} })).toBeNull();
    store.getState().dispose();
  });

  it("returns an empty plan for a rejected decision without calling preview_commit", async () => {
    const repo = await freshDb();
    const { frame } = await repo.createBlankFrame({ title: "x" });
    const autosave = createAutosaveController({ repo });
    const crosstab = createCrossTabBus();
    const compute_driver = createComputeDriver({ now: () => TEST_NOW });
    const dispatch = makeFrameDispatch({});
    const preview_commit = vi.fn(() => ({ writes: [{ op: "set", field_path: "x", value: 1 }] }));
    const store = createFrameStore({
      repo,
      autosave,
      crosstab,
      dispatch,
      compute_driver,
      now: injectedNow(TEST_NOW),
      generateId: injectedGenerateId(),
      invoke_hook: vi.fn().mockResolvedValue({ hook_id: "G1", parsed: { x: 1 } }),
      preview_commit,
    });
    await store.getState().loadFrame(frame.id);
    await flushPromises();
    // Seed a pending_suggestion by calling invokeHook with a fake result.
    await store.getState().invokeHook("G1", {});
    await flushPromises();
    const plan = store.getState().previewCommit({ kind: "rejected" });
    expect(plan).toEqual({ writes: [], versioned: false });
    expect(preview_commit).not.toHaveBeenCalled();
    store.getState().dispose();
  });

  it("routes accepted/edited decisions through the injected preview_commit", async () => {
    const repo = await freshDb();
    const { frame } = await repo.createBlankFrame({ title: "x" });
    const autosave = createAutosaveController({ repo });
    const crosstab = createCrossTabBus();
    const compute_driver = createComputeDriver({ now: () => TEST_NOW });
    const dispatch = makeFrameDispatch({});
    const expected_plan = {
      writes: [{ op: "create_node", field_path: "nodes", value: { type: "Term" } }],
      versioned: true,
    };
    const preview_commit = vi.fn(() => expected_plan);
    const store = createFrameStore({
      repo,
      autosave,
      crosstab,
      dispatch,
      compute_driver,
      now: injectedNow(TEST_NOW),
      generateId: injectedGenerateId(),
      invoke_hook: vi.fn().mockResolvedValue({ hook_id: "G2", parsed: { interp: "A" } }),
      preview_commit,
    });
    await store.getState().loadFrame(frame.id);
    await flushPromises();
    await store.getState().invokeHook("G2", {});
    await flushPromises();

    const decision = { kind: "accepted", final: { interp: "A" } };
    const plan = store.getState().previewCommit(decision);
    expect(plan).toBe(expected_plan);
    expect(preview_commit).toHaveBeenCalledWith(
      "G2",
      expect.objectContaining({ hook_id: "G2" }),
      decision,
    );
    store.getState().dispose();
  });

  it("returns null when preview_commit throws", async () => {
    const repo = await freshDb();
    const { frame } = await repo.createBlankFrame({ title: "x" });
    const autosave = createAutosaveController({ repo });
    const crosstab = createCrossTabBus();
    const compute_driver = createComputeDriver({ now: () => TEST_NOW });
    const preview_commit = vi.fn(() => {
      throw new Error("commit blew up");
    });
    const store = createFrameStore({
      repo,
      autosave,
      crosstab,
      dispatch: makeFrameDispatch({}),
      compute_driver,
      now: injectedNow(TEST_NOW),
      generateId: injectedGenerateId(),
      invoke_hook: vi.fn().mockResolvedValue({ hook_id: "G2", parsed: {} }),
      preview_commit,
    });
    await store.getState().loadFrame(frame.id);
    await flushPromises();
    await store.getState().invokeHook("G2", {});
    await flushPromises();
    expect(store.getState().previewCommit({ kind: "accepted", final: {} })).toBeNull();
    store.getState().dispose();
  });
});
