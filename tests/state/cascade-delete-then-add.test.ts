// Repro test for the reported bug:
//   user deletes one or more nodes via the cascade-delete flow, then clicks
//   "Sub-question" in NodePalette → deleted nodes reappear.
//
// We bypass the dialog/hook layer (which has already been ruled out by the
// caller) and call applyPatch directly with the same patch shape the hook
// emits. We use the REAL frameActions dispatcher and a fresh repo so this
// test mirrors the production state-layer code path 1:1.
//
// Result: this test PASSES. The state layer correctly:
//   - removes target+cascade in one applyPatch round-trip
//   - reads fresh `frame_version` from get() inside applyPatch (frame-store.ts:70)
//   - node_added spreads the *current* fv.nodes (frame-actions.ts:109)
// Therefore the bug lives in the UI layer (react re-render, stale closure,
// reload-from-repo, or RF reconcile), NOT in the action runner / dispatch.

import { describe, it, expect } from "vitest";
import { createFrameStore, createComputeDriver } from "@/state";
import { createAutosaveController, createCrossTabBus } from "@/persistence";
import { frameActions } from "@/modes";
import type { Node } from "@/schema";
import { freshDb, flushPromises, injectedNow, injectedGenerateId } from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

function makeSubQ(id: string): Node {
  return {
    id,
    type: "SubQuestion",
    layer: "frame",
    statement: `SubQ ${id}`,
    is_jurisdictional: false,
    created_at: TEST_NOW,
    updated_at: TEST_NOW,
  } as Node;
}

async function makeEnvWithFiveNodes() {
  const repo = await freshDb();
  const now = injectedNow(TEST_NOW);
  const generateId = injectedGenerateId();

  const { frame } = await repo.createBlankFrame({ title: "Repro" });
  const autosave = createAutosaveController({ repo });
  const crosstab = createCrossTabBus();
  const compute_driver = createComputeDriver({ now: () => TEST_NOW });

  const store = createFrameStore({
    repo,
    autosave,
    crosstab,
    dispatch: frameActions,
    compute_driver,
    now,
    generateId,
  });

  await store.getState().loadFrame(frame.id);
  await flushPromises();

  // Seed 5 SubQuestion nodes by applying node_added five times. Using
  // applyPatch (not direct setState) so we exercise the same path the bug
  // report alleges.
  for (const id of ["n-1", "n-2", "n-3", "n-4", "n-5"]) {
    store.getState().applyPatch({ kind: "node_added", node: makeSubQ(id) });
  }

  return { store, frame, autosave, crosstab };
}

describe("repro: delete-then-add does not resurrect deleted nodes", () => {
  it("after removing 3 of 5 nodes, adding one yields 3 nodes total (not 6)", async () => {
    const { store } = await makeEnvWithFiveNodes();

    expect(store.getState().frame_version?.nodes).toHaveLength(5);

    // Step: remove n-1, n-2, n-3 via cascade-shaped patches (same shape the
    // cascade-confirmation hook emits in src/ui/hooks/use-cascade-confirmation.ts:38).
    store.getState().applyPatch({
      kind: "node_removed",
      node_id: "n-1",
      cascade: { node_ids: [], edge_ids: [] },
    });
    store.getState().applyPatch({
      kind: "node_removed",
      node_id: "n-2",
      cascade: { node_ids: [], edge_ids: [] },
    });
    store.getState().applyPatch({
      kind: "node_removed",
      node_id: "n-3",
      cascade: { node_ids: [], edge_ids: [] },
    });

    expect(
      store
        .getState()
        .frame_version?.nodes.map((n) => n.id)
        .sort(),
    ).toEqual(["n-4", "n-5"]);

    // Step: simulate the NodePalette click adding a new SubQuestion.
    store.getState().applyPatch({ kind: "node_added", node: makeSubQ("n-new") });

    const final_ids = store
      .getState()
      .frame_version?.nodes.map((n) => n.id)
      .sort();

    // If the bug is in the state-layer, this assertion fails (6 instead of 3).
    expect(final_ids).toEqual(["n-4", "n-5", "n-new"]);

    store.getState().dispose();
  });

  it("same scenario, but with cascade-shape that mirrors the hook exactly (deleted nodes carried in cascade.node_ids)", async () => {
    // The cascade-confirmation hook passes the cascade *descendants* in
    // summary.cascade_nodes, NOT the target itself. The handler in
    // frame-actions.ts:132 unions target+cascade. To approximate "user
    // deletes one parent node whose deletion cascades to 2 children",
    // we install an edge graph: n-1 → n-2 → n-3 via DECOMPOSES_INTO.
    // For this repro we use the patch shape directly without computing
    // cascade — we just want to verify the dispatcher honors the union.

    const { store } = await makeEnvWithFiveNodes();

    store.getState().applyPatch({
      kind: "node_removed",
      node_id: "n-1",
      cascade: { node_ids: ["n-2", "n-3"], edge_ids: [] },
    });

    expect(
      store
        .getState()
        .frame_version?.nodes.map((n) => n.id)
        .sort(),
    ).toEqual(["n-4", "n-5"]);

    store.getState().applyPatch({ kind: "node_added", node: makeSubQ("n-new") });

    expect(
      store
        .getState()
        .frame_version?.nodes.map((n) => n.id)
        .sort(),
    ).toEqual(["n-4", "n-5", "n-new"]);

    store.getState().dispose();
  });
});
