import { describe, it, expect } from "vitest";
import {
  selectStatusSummary,
  selectInterviewItems,
  selectFrameVersionDrift,
  selectOutputForView,
  selectStatusBadge,
  type SessionShape,
} from "@/state";
import type { SessionStoreSnapshot } from "@/state";
import type { FrameStoreSnapshot } from "@/state";
import type { ArgumentSession, FrameVersion, NodeStatus, ConditionalOutput } from "@/schema";
import type { ComputeResult } from "@/runtime";

const ts = "2026-05-12T00:00:00.000Z";

const empty_frame_version: FrameVersion = {
  id: "fv-1",
  frame_id: "f-1",
  version_number: 1,
  created_at: ts,
  nodes: [],
  edges: [],
  is_milestone: false,
};

function makeSession(overrides: Partial<ArgumentSession> = {}): ArgumentSession {
  return {
    id: "s-1",
    frame_id: "f-1",
    frame_version_id: "fv-1",
    frame_version_snapshot: empty_frame_version,
    title: "Test",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: ts,
    updated_at: ts,
    current_version_id: "sv-1",
    ...overrides,
  };
}

function makeCompute(
  shape: SessionShape,
  status_map_arr: Array<[string, NodeStatus]>,
  output_overrides: Partial<ConditionalOutput> = {},
): ComputeResult {
  return {
    validation_results: [],
    foreclosed_set: new Set(),
    reachable_set: new Set(),
    active_set: new Set(),
    status_map: new Map(status_map_arr),
    active_path: [],
    output: {
      shape,
      prose_summary: "Test prose",
      computed_at: ts,
      confidence_breakdown: {
        total_checkpoints_on_path: 0,
        satisfied_via_binding: 0,
        satisfied_via_persuasive: 0,
        satisfied_via_stipulation: 0,
        satisfied_via_structural: 0,
        contested: 0,
        open: 0,
      },
      ...output_overrides,
    },
    open_gates: [],
  };
}

function snap(
  session: ArgumentSession | null,
  compute_result: ComputeResult | null,
): SessionStoreSnapshot {
  return {
    session,
    session_version: null,
    compute_result,
    sessions_list: [],
    is_loading: false,
    error: null,
    pending_suggestion: null,
    suggestion_status: "idle",
  };
}

describe("selectStatusSummary", () => {
  it("returns null when there is no compute_result", () => {
    expect(selectStatusSummary(snap(makeSession(), null))).toBeNull();
  });

  it("returns null when there is no session", () => {
    expect(selectStatusSummary(snap(null, null))).toBeNull();
  });

  it("counts resolved nodes from status_map and exposes output shape", () => {
    const ns = (s: NodeStatus["status"]): NodeStatus => ({ status: s, evaluated_at: ts });
    const cr = makeCompute("conditional", [
      ["a", ns("satisfied")],
      ["b", ns("open")],
      ["c", ns("satisfied")],
      ["d", ns("contested")],
    ]);
    const summary = selectStatusSummary(snap(makeSession(), cr));
    expect(summary).toEqual({
      shape: "conditional",
      resolved_count: 2,
      total_count: 4,
      conclusion_label: undefined,
    });
  });
});

describe("selectInterviewItems", () => {
  it("returns [] when no session or compute_result", () => {
    expect(selectInterviewItems(snap(null, null))).toEqual([]);
  });
});

describe("selectFrameVersionDrift", () => {
  it("returns null when stores aren't loaded", () => {
    const frame_snapshot: FrameStoreSnapshot = {
      frame: null,
      frame_version: null,
      validation: [],
      is_loading: false,
      error: null,
      pending_suggestion: null,
      suggestion_status: "idle",
    };
    expect(selectFrameVersionDrift(snap(null, null), frame_snapshot)).toBeNull();
  });

  it("detects has_drift when version ids differ", () => {
    const cr = makeCompute("incomplete", []);
    const session = makeSession();
    const newer_version: FrameVersion = {
      id: "fv-2",
      frame_id: "f-1",
      version_number: 2,
      created_at: ts,
      nodes: [],
      edges: [],
      is_milestone: false,
    };
    const frame_snapshot: FrameStoreSnapshot = {
      frame: {
        id: "f-1",
        title: "F",
        mode: "general",
        flavor: "personal",
        current_version_id: "fv-2",
        created_at: ts,
        updated_at: ts,
      } as unknown as FrameStoreSnapshot["frame"],
      frame_version: newer_version,
      validation: [],
      is_loading: false,
      error: null,
      pending_suggestion: null,
      suggestion_status: "idle",
    };
    const drift = selectFrameVersionDrift(snap(session, cr), frame_snapshot);
    expect(drift?.has_drift).toBe(true);
    expect(drift?.session_version_number).toBe(1);
    expect(drift?.current_version_number).toBe(2);
  });

  it("reports no drift when version ids match", () => {
    const session = makeSession();
    const frame_snapshot: FrameStoreSnapshot = {
      frame: {
        id: "f-1",
        title: "F",
        mode: "general",
        flavor: "personal",
        current_version_id: "fv-1",
        created_at: ts,
        updated_at: ts,
      } as unknown as FrameStoreSnapshot["frame"],
      frame_version: empty_frame_version,
      validation: [],
      is_loading: false,
      error: null,
      pending_suggestion: null,
      suggestion_status: "idle",
    };
    const drift = selectFrameVersionDrift(
      snap(session, makeCompute("incomplete", [])),
      frame_snapshot,
    );
    expect(drift?.has_drift).toBe(false);
  });
});

describe("selectOutputForView", () => {
  it("returns null without compute_result", () => {
    expect(selectOutputForView(snap(null, null), "prose")).toBeNull();
  });

  it("returns prose canonical + rewritten for the prose tab", () => {
    const cr = makeCompute("determinate", []);
    cr.output.prose_summary = "Canonical";
    const snapshot = snap(makeSession(), cr);
    snapshot.session_version = {
      id: "sv-1",
      session_id: "s-1",
      version_number: 1,
      created_at: ts,
      premises: [],
      argument_edges: [],
      checkpoint_responses: [],
      interpretation_selections: [],
      is_milestone: false,
      output_overrides: { rewritten_prose: "Rewritten" },
    };
    const payload = selectOutputForView(snapshot, "prose");
    expect(payload?.shape).toBe("determinate");
    expect(payload?.prose?.canonical).toBe("Canonical");
    expect(payload?.prose?.rewritten).toBe("Rewritten");
  });

  it("returns decision_tree.branches for the decision_tree tab", () => {
    const cr = makeCompute("conditional", [], {
      branches: [
        {
          id: "b1",
          conditions: [],
          resulting_conclusion: "c1",
          intermediate_path: [],
          prose: "",
        },
      ],
    });
    const payload = selectOutputForView(snap(makeSession(), cr), "decision_tree");
    expect(payload?.decision_tree?.branches).toHaveLength(1);
  });

  it("returns path_overlay.active_path for the path_overlay tab", () => {
    const cr = makeCompute("determinate", [], { primary_path: ["x", "y"], conclusion: "c1" });
    const payload = selectOutputForView(snap(makeSession(), cr), "path_overlay");
    expect(payload?.path_overlay?.active_path).toEqual(["x", "y"]);
    expect(payload?.path_overlay?.conclusion).toBe("c1");
  });
});

describe("selectStatusBadge", () => {
  it("returns null when no compute_result", () => {
    expect(selectStatusBadge(snap(null, null), "x")).toBeNull();
  });

  it("returns the badge data for a node when present", () => {
    const cr = makeCompute("incomplete", [["x", { status: "open", evaluated_at: ts }]]);
    const badge = selectStatusBadge(snap(makeSession(), cr), "x");
    expect(badge?.status).toBe("open");
  });

  it("returns null when the node isn't in the status_map", () => {
    const cr = makeCompute("incomplete", []);
    expect(selectStatusBadge(snap(makeSession(), cr), "missing")).toBeNull();
  });
});
