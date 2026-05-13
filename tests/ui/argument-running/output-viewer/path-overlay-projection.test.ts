import { describe, it, expect } from "vitest";
import { buildArgumentOverlayProjection } from "@/ui/argument-running/output-viewer/path-overlay-tab";
import type { ArgumentSession } from "@/schema";

const ts = "2026-05-12T00:00:00.000Z";

function session(): ArgumentSession {
  return {
    id: "s1",
    frame_id: "f1",
    frame_version_id: "fv1",
    frame_version_snapshot: {
      id: "fv1",
      frame_id: "f1",
      version_number: 1,
      created_at: ts,
      nodes: [],
      edges: [],
      is_milestone: false,
    },
    title: "Session",
    premises: [],
    argument_edges: [
      {
        id: "e-b",
        type: "ANSWERS",
        layer: "argument",
        source: "p1",
        target: "c1",
        selected_option_id: "o1",
        created_at: ts,
        updated_at: ts,
      },
      {
        id: "e-a",
        type: "SUPPORTS",
        layer: "argument",
        source: "p2",
        target: "i1",
        created_at: ts,
        updated_at: ts,
      },
      {
        id: "e-c",
        type: "CITES",
        layer: "frame",
        source: "i1",
        target: "a1",
        created_at: ts,
        updated_at: ts,
      },
      {
        id: "e-d",
        type: "CONTRADICTS",
        layer: "argument",
        source: "p3",
        target: "i2",
        created_at: ts,
        updated_at: ts,
      },
    ],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: ts,
    updated_at: ts,
    current_version_id: "sv1",
  };
}

describe("buildArgumentOverlayProjection", () => {
  it("filters to ANSWERS / SUPPORTS / CONTRADICTS only", () => {
    const overlay = buildArgumentOverlayProjection(session());
    const ids = overlay.edges.map((e) => e.id);
    expect(ids).not.toContain("e-c"); // CITES dropped
    expect(ids).toHaveLength(3);
  });

  it("sorts deterministically by id", () => {
    const overlay = buildArgumentOverlayProjection(session());
    const ids = overlay.edges.map((e) => e.id);
    expect(ids).toEqual(["e-a", "e-b", "e-d"]);
  });
});
