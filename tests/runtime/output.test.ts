import { describe, it, expect } from "vitest";
import { compute } from "@/runtime";
import { buildLegalSimple, buildLegalWithCheckpoint, T0 } from "./_fixtures";

function inputFrom(fixture: ReturnType<typeof buildLegalSimple>, computed_at: string) {
  return {
    frame_version_snapshot: fixture.frame.version,
    checkpoint_responses: fixture.session.session.checkpoint_responses,
    interpretation_selections: fixture.session.session.interpretation_selections,
    premises: fixture.session.session.premises,
    argument_edges: fixture.session.session.argument_edges,
    session_authorities: fixture.session.session.session_authorities ?? [],
    computed_at,
    ...(fixture.frame.frame.jurisdiction_default
      ? { jurisdiction_default: fixture.frame.frame.jurisdiction_default }
      : {}),
  };
}

describe("generateOutput — shape determination", () => {
  it("validation errors → shape:incomplete", () => {
    // Build a deliberately invalid frame: RootQuestion only.
    const inputs = {
      frame_version_snapshot: {
        id: "v",
        frame_id: "f",
        version_number: 1,
        created_at: T0,
        nodes: [],
        edges: [],
        is_milestone: false,
      },
      checkpoint_responses: [],
      interpretation_selections: [],
      premises: [],
      argument_edges: [],
      session_authorities: [],
      computed_at: T0,
    };
    const r = compute(inputs);
    expect(r.output.shape).toBe("incomplete");
  });

  it("simple-2-step legal: reaches determinate shape", () => {
    const fixture = buildLegalWithCheckpoint();
    const r = compute(inputFrom(fixture, T0));
    expect(r.output.shape).toBe("determinate");
    expect(r.output.conclusion).toBe("n-concl");
  });
});

describe("output — prose summary determinism", () => {
  it("prose summary is byte-identical across two calls", () => {
    const fixture = buildLegalWithCheckpoint();
    const a = compute(inputFrom(fixture, T0));
    const b = compute(inputFrom(fixture, T0));
    expect(a.output.prose_summary).toBe(b.output.prose_summary);
  });

  it("prose summary differs only via computed_at (not in the prose body)", () => {
    const fixture = buildLegalWithCheckpoint();
    const a = compute(inputFrom(fixture, "2026-05-10T00:00:00.000Z"));
    const b = compute(inputFrom(fixture, "2026-06-10T00:00:00.000Z"));
    // The prose summary itself is computed from path + node text only; the
    // computed_at field is a sibling, not embedded in prose.
    expect(a.output.prose_summary).toBe(b.output.prose_summary);
    expect(a.output.computed_at).toBe("2026-05-10T00:00:00.000Z");
    expect(b.output.computed_at).toBe("2026-06-10T00:00:00.000Z");
  });
});

describe("output — open_gates sorted by node_id", () => {
  it("open_gates list is sorted", () => {
    // Build a frame with an open Term (no selection).
    const fixture = buildLegalSimple();
    const session = fixture.session.session;
    const r = compute({
      frame_version_snapshot: fixture.frame.version,
      checkpoint_responses: session.checkpoint_responses,
      interpretation_selections: [], // no selection → Term open
      premises: session.premises,
      argument_edges: session.argument_edges,
      session_authorities: session.session_authorities ?? [],
      computed_at: T0,
    });
    if (r.open_gates.length > 1) {
      for (let i = 1; i < r.open_gates.length; i++) {
        expect(
          r.open_gates[i - 1].node_id.localeCompare(r.open_gates[i].node_id),
        ).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe("confidence breakdown", () => {
  it("counts Checkpoints on path; stipulated premise → satisfied_via_stipulation", () => {
    const fixture = buildLegalWithCheckpoint();
    const r = compute(inputFrom(fixture, T0));
    const cb = r.output.confidence_breakdown;
    expect(cb.total_checkpoints_on_path).toBe(1);
    expect(cb.satisfied_via_stipulation).toBe(1);
  });
});
