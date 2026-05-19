import { describe, it, expect } from "vitest";
import { runFrameAction, runSessionAction, validateOnly } from "@/state";
import { createComputeDriver } from "@/state";
import {
  makeFrame,
  makeFrameVersion,
  makeSession,
  makeSessionVersion,
  makeFrameDispatch,
  makeSessionDispatch,
  makeNode,
  injectedNow,
  injectedGenerateId,
} from "./_setup";

const TEST_NOW = "2026-05-10T00:00:00.000Z";

function makeNow() {
  return injectedNow(TEST_NOW);
}

function makeId() {
  return injectedGenerateId();
}

const compute_driver = createComputeDriver({ now: () => TEST_NOW });

// AT-STATE-AR-1: frame patch → next_version/frame reflects change
describe("runFrameAction", () => {
  it("node_added patch adds node via dispatch stub", () => {
    const frame = makeFrame();
    const fv = makeFrameVersion();
    const node = makeNode("n-1");
    const dispatch = makeFrameDispatch({
      node_added: (_frame, _fv, patch, _opts) => ({
        next_version: { ..._fv, nodes: [..._fv.nodes, patch.node] },
      }),
    });
    const id_gen = makeId();
    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "node_added", node },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
    });

    expect(result.next_version.nodes).toHaveLength(1);
    expect(result.next_version.nodes[0]?.id).toBe("n-1");
  });

  it("stamps new version metadata on next_version", () => {
    const frame = makeFrame();
    const fv = makeFrameVersion({ version_number: 3 });
    const dispatch = makeFrameDispatch();
    const id_gen = makeId();

    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "presentation_hints_reset_all" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
    });

    expect(result.next_version.version_number).toBe(4);
    expect(result.next_version.parent_version_id).toBe("fv-1");
    expect(result.next_version.created_at).toBe(TEST_NOW);
    expect(result.next_frame.current_version_id).toBe(result.next_version.id);
  });

  it("metadata_edited patch updates frame_partial fields", () => {
    const frame = makeFrame({ title: "Old Title" });
    const fv = makeFrameVersion();
    const dispatch = makeFrameDispatch();
    const id_gen = makeId();

    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "metadata_edited", partial: { title: "New Title" } },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
    });

    expect(result.next_frame.title).toBe("New Title");
  });

  it("recomputes active sessions when driver and sessions provided", () => {
    const frame = makeFrame();
    const fv = makeFrameVersion();
    const session = makeSession();
    const session_version = makeSessionVersion();
    const dispatch = makeFrameDispatch();
    const id_gen = makeId();

    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "presentation_hints_reset_all" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
      active_sessions: [{ session, version: session_version }],
    });

    expect(result.recomputed.has("s-1")).toBe(true);
  });

  it("returns empty recomputed map when no sessions provided", () => {
    const frame = makeFrame();
    const fv = makeFrameVersion();
    const dispatch = makeFrameDispatch();
    const id_gen = makeId();

    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "presentation_hints_reset_all" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
    });

    expect(result.recomputed.size).toBe(0);
  });
});

// AT-STATE-AR-2: session patch → compute_result reflects update
describe("runSessionAction", () => {
  it("premise_added patch updates next_session.premises", () => {
    const session = makeSession();
    const version = makeSessionVersion();
    const dispatch = makeSessionDispatch();
    const id_gen = makeId();
    const premise: import("@/schema").Premise = {
      id: "p-1",
      type: "Premise",
      layer: "argument",
      statement: "Test premise",
      kind: "empirical",
      created_at: TEST_NOW,
      updated_at: TEST_NOW,
    };

    const result = runSessionAction({
      session,
      current_version: version,
      patch: { kind: "premise_added", premise },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
    });

    expect(result.next_session.premises).toHaveLength(1);
    expect(result.next_session.premises[0]?.id).toBe("p-1");
  });

  it("stamps new version metadata on next_version", () => {
    const session = makeSession();
    const version = makeSessionVersion({ version_number: 2 });
    const dispatch = makeSessionDispatch();
    const id_gen = makeId();

    const result = runSessionAction({
      session,
      current_version: version,
      patch: { kind: "output_overrides_cleared" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
    });

    expect(result.next_version.version_number).toBe(3);
    expect(result.next_version.parent_version_id).toBe("sv-1");
    expect(result.next_session.current_version_id).toBe(result.next_version.id);
  });

  it("populates status_map from compute result", () => {
    const session = makeSession();
    const version = makeSessionVersion();
    const dispatch = makeSessionDispatch();
    const id_gen = makeId();

    const result = runSessionAction({
      session,
      current_version: version,
      patch: { kind: "output_overrides_cleared" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
    });

    // compute_result should be present (even if empty for blank session)
    expect(result.compute_result).toBeDefined();
    expect(result.next_session.output).toBeDefined();
  });

  // §8 #1: every session-version captures the frame it was authored against
  // so version-history preview can render the historical frame.
  it("snapshots session.frame_version_snapshot onto next_version (§8 #1)", () => {
    const session = makeSession();
    const version = makeSessionVersion();
    const dispatch = makeSessionDispatch();
    const id_gen = makeId();

    const result = runSessionAction({
      session,
      current_version: version,
      patch: { kind: "output_overrides_cleared" },
      now: TEST_NOW,
      generateId: id_gen,
      dispatch,
      compute_driver,
    });

    expect(result.next_version.frame_version_snapshot).toBeDefined();
    expect(result.next_version.frame_version_snapshot?.id).toBe(session.frame_version_snapshot.id);
  });
});

// AT-STATE-AR-3: validateOnly returns errors for invalid frame
describe("validateOnly", () => {
  it("returns V-FR-1 error for frame with no RootQuestion", () => {
    const fv = makeFrameVersion({ nodes: [] });
    const results = validateOnly(fv);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors.some((r) => r.rule_id === "V-FR-1")).toBe(true);
  });

  it("returns errors when a node has a duplicate id", () => {
    const n1 = makeNode("dup");
    const n2 = makeNode("dup");
    const fv = makeFrameVersion({ nodes: [n1, n2] });
    const results = validateOnly(fv);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns no duplicate-id errors for a frame with unique nodes", () => {
    const n1 = makeNode("n-a");
    const n2 = makeNode("n-b");
    const fv = makeFrameVersion({ nodes: [n1, n2] });
    const results = validateOnly(fv);
    const dupErrors = results.filter((r) => r.severity === "error" && r.rule_id === "V-NODE-1");
    expect(dupErrors).toHaveLength(0);
  });
});

describe("makeNow and makeId helpers are deterministic in tests", () => {
  it("injectedNow increments by 1 second", () => {
    const n = makeNow();
    expect(n()).toBe("2026-05-10T00:00:00.000Z");
    expect(n()).toBe("2026-05-10T00:00:01.000Z");
  });

  it("injectedGenerateId produces unique sequential ids", () => {
    const g = makeId();
    const a = g();
    const b = g();
    expect(a).not.toBe(b);
  });
});
