import { describe, it, expect } from "vitest";
import { diffFrameVersions, diffSessionVersions } from "@/persistence";
import type { FrameVersion, ArgumentSessionVersion, RootQuestion } from "@/schema";

const T = "2026-05-10T00:00:00.000Z";

function makeFrameVersion(overrides: Partial<FrameVersion> = {}): FrameVersion {
  return {
    id: "fv-a",
    frame_id: "frame-1",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function makeSessionVersion(
  overrides: Partial<ArgumentSessionVersion> = {},
): ArgumentSessionVersion {
  return {
    id: "sv-a",
    session_id: "sess-1",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    ...overrides,
  };
}

function rq(id: string, statement: string, extra: Partial<RootQuestion> = {}): RootQuestion {
  return {
    id,
    type: "RootQuestion",
    layer: "frame",
    statement,
    created_at: T,
    updated_at: T,
    ...extra,
  };
}

describe("persistence/diff", () => {
  it("diffFrameVersions: empty diff when a === b", () => {
    const fv = makeFrameVersion({ nodes: [rq("n1", "Q?")] });
    const result = diffFrameVersions(fv, fv);
    expect(result.nodes.added).toHaveLength(0);
    expect(result.nodes.removed).toHaveLength(0);
    expect(result.nodes.edited).toHaveLength(0);
    expect(result.edges.added).toHaveLength(0);
    expect(result.layout_only).toBe(false);
    expect(result.layout_changed_count).toBe(0);
  });

  it("diffFrameVersions: detects added/removed/edited nodes by id", () => {
    const nodeA = rq("n-a", "Old?");
    const nodeB = rq("n-b", "New?");
    const nodeA_edited = { ...nodeA, statement: "Changed?" };

    const fv_a = makeFrameVersion({ nodes: [nodeA] });
    const fv_b = makeFrameVersion({ nodes: [nodeA_edited, nodeB] });

    const result = diffFrameVersions(fv_a, fv_b);
    expect(result.nodes.added).toContain("n-b");
    expect(result.nodes.removed).toHaveLength(0);
    expect(result.nodes.edited.some((e) => e.id === "n-a")).toBe(true);
    const n_a_edit = result.nodes.edited.find((e) => e.id === "n-a");
    expect(n_a_edit?.fields_changed).toContain("statement");
  });

  it("diffFrameVersions: detects added/removed/edited edges by id", () => {
    const edgeA = {
      id: "e-a",
      type: "LEADS_TO" as const,
      layer: "frame" as const,
      source: "n1",
      target: "n2",
      created_at: T,
      updated_at: T,
    };
    const edgeB = {
      id: "e-b",
      type: "LEADS_TO" as const,
      layer: "frame" as const,
      source: "n2",
      target: "n3",
      created_at: T,
      updated_at: T,
    };

    const fv_a = makeFrameVersion({ edges: [edgeA] });
    const fv_b = makeFrameVersion({ edges: [edgeB] });

    const result = diffFrameVersions(fv_a, fv_b);
    expect(result.edges.added).toContain("e-b");
    expect(result.edges.removed).toContain("e-a");
  });

  it("diffFrameVersions: layout-only changes are bucketed into layout_changed_count", () => {
    const nodeA = rq("n1", "Q?", { presentation: { x: 0, y: 0 } });
    const nodeB = { ...nodeA, presentation: { x: 50, y: 80 } };

    const fv_a = makeFrameVersion({ nodes: [nodeA] });
    const fv_b = makeFrameVersion({ nodes: [nodeB] });

    const result = diffFrameVersions(fv_a, fv_b);
    expect(result.nodes.edited).toHaveLength(0);
    expect(result.layout_changed_count).toBe(1);
    expect(result.layout_only).toBe(true);
  });

  it("diffFrameVersions: mixed layout + semantic changes do NOT set layout_only", () => {
    const nodeA = rq("n1", "Q?", { presentation: { x: 0, y: 0 } });
    const nodeB = { ...nodeA, statement: "Changed?", presentation: { x: 50, y: 80 } };

    const fv_a = makeFrameVersion({ nodes: [nodeA] });
    const fv_b = makeFrameVersion({ nodes: [nodeB] });

    const result = diffFrameVersions(fv_a, fv_b);
    expect(result.layout_only).toBe(false);
    expect(result.nodes.edited).toHaveLength(1);
  });

  it("diffFrameVersions: metadata.changed_fields surfaces FrameVersion-level field changes", () => {
    const fv_a = makeFrameVersion({ is_milestone: false });
    const fv_b = makeFrameVersion({ is_milestone: true, change_summary: "bumped" });

    const result = diffFrameVersions(fv_a, fv_b);
    const fields = result.metadata.changed_fields.map((c) => c.field);
    expect(fields).toContain("is_milestone");
    expect(fields).toContain("change_summary");
  });

  it("diffFrameVersions: output arrays are sorted by id for stable snapshots", () => {
    const nodes = ["z-node", "a-node", "m-node"].map((id) => rq(id, "Q?"));

    const fv_a = makeFrameVersion({ nodes: [] });
    const fv_b = makeFrameVersion({ nodes });
    const result = diffFrameVersions(fv_a, fv_b);
    expect(result.nodes.added).toStrictEqual(["a-node", "m-node", "z-node"]);
  });

  it("diffFrameVersions: two calls on identical inputs return structurally equal output", () => {
    const nodeA = rq("n1", "Q?");
    const nodeA_edited = { ...nodeA, statement: "Changed?" };
    const fv_a = makeFrameVersion({ nodes: [nodeA] });
    const fv_b = makeFrameVersion({ nodes: [nodeA_edited] });

    const r1 = diffFrameVersions(fv_a, fv_b);
    const r2 = diffFrameVersions(fv_a, fv_b);
    expect(r1).toStrictEqual(r2);
  });

  it("diffSessionVersions: detects added/removed Premises", () => {
    const p1 = {
      id: "p1",
      type: "Premise" as const,
      layer: "argument" as const,
      statement: "S",
      kind: "found" as const,
      created_at: T,
      updated_at: T,
    };
    const p2 = {
      id: "p2",
      type: "Premise" as const,
      layer: "argument" as const,
      statement: "S2",
      kind: "found" as const,
      created_at: T,
      updated_at: T,
    };

    const sv_a = makeSessionVersion({ premises: [p1] });
    const sv_b = makeSessionVersion({ premises: [p2] });

    const result = diffSessionVersions(sv_a, sv_b);
    expect(result.premises.added).toContain("p2");
    expect(result.premises.removed).toContain("p1");
  });

  it("diffSessionVersions: detects edited CheckpointResponses by checkpoint_id", () => {
    const cr_a = {
      checkpoint_id: "cp1",
      selected_option_id: "opt-yes",
      premise_id: "p1",
      answered_at: T,
    };
    const cr_b = {
      checkpoint_id: "cp1",
      selected_option_id: "opt-no",
      premise_id: "p1",
      answered_at: T,
    };

    const sv_a = makeSessionVersion({ checkpoint_responses: [cr_a] });
    const sv_b = makeSessionVersion({ checkpoint_responses: [cr_b] });

    const result = diffSessionVersions(sv_a, sv_b);
    expect(result.checkpoint_responses.edited).toHaveLength(1);
    expect(result.checkpoint_responses.edited[0].checkpoint_id).toBe("cp1");
    expect(result.checkpoint_responses.edited[0].fields_changed).toContain("selected_option_id");
  });

  it("diffSessionVersions: detects edited InterpretationSelections by term_id", () => {
    const is_a = { term_id: "t1", selected_interpretation_ids: ["interp-a"], selected_at: T };
    const is_b = { term_id: "t1", selected_interpretation_ids: ["interp-b"], selected_at: T };

    const sv_a = makeSessionVersion({ interpretation_selections: [is_a] });
    const sv_b = makeSessionVersion({ interpretation_selections: [is_b] });

    const result = diffSessionVersions(sv_a, sv_b);
    expect(result.interpretation_selections.edited).toHaveLength(1);
    expect(result.interpretation_selections.edited[0].term_id).toBe("t1");
  });
});
