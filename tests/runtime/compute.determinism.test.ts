import { describe, it, expect } from "vitest";
import { compute } from "@/runtime";
import { buildLegalSimple, buildAcademicDispute, T0 } from "./_fixtures";

const T1 = "2026-12-31T23:59:59.000Z";

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

function serialize(result: ReturnType<typeof compute>): unknown {
  const sm: Array<[string, unknown]> = [];
  for (const pair of result.status_map) sm.push([pair[0], pair[1]]);
  sm.sort((a, b) => a[0].localeCompare(b[0]));
  return {
    validation_results: result.validation_results,
    foreclosed: [...result.foreclosed_set].sort(),
    reachable: [...result.reachable_set].sort(),
    active: [...result.active_set].sort(),
    status_map: sm,
    active_path: result.active_path,
    output: result.output,
    open_gates: result.open_gates,
  };
}

function stripTimestamps(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripTimestamps);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      if (k === "evaluated_at" || k === "computed_at") continue;
      out[k] = stripTimestamps((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

describe("compute — keystone determinism", () => {
  it("byte-identical output across two invocations on the same input (legal)", () => {
    const fixture = buildLegalSimple();
    const a = compute(inputFrom(fixture, T0));
    const b = compute(inputFrom(fixture, T0));
    expect(serialize(b)).toEqual(serialize(a));
  });

  it("structural equality under permuted input arrays", () => {
    const fixture = buildLegalSimple();
    const base = inputFrom(fixture, T0);
    const a = compute(base);
    const reversedFrame = {
      ...fixture.frame.version,
      nodes: [...fixture.frame.version.nodes].reverse(),
      edges: [...fixture.frame.version.edges].reverse(),
    };
    const b = compute({
      ...base,
      frame_version_snapshot: reversedFrame,
      checkpoint_responses: [...base.checkpoint_responses].reverse(),
      interpretation_selections: [...base.interpretation_selections].reverse(),
      premises: [...base.premises].reverse(),
      argument_edges: [...base.argument_edges].reverse(),
      session_authorities: [...base.session_authorities].reverse(),
    });
    expect(serialize(b)).toEqual(serialize(a));
  });

  it("frozen-clock independence — differs only in evaluated_at / computed_at fields", () => {
    const fixture = buildLegalSimple();
    const r1 = compute(inputFrom(fixture, T0));
    const r2 = compute(inputFrom(fixture, T1));
    expect(stripTimestamps(serialize(r1))).toEqual(stripTimestamps(serialize(r2)));
    for (const pair of r1.status_map) {
      expect(pair[1].evaluated_at).toBe(T0);
    }
    for (const pair of r2.status_map) {
      expect(pair[1].evaluated_at).toBe(T1);
    }
    expect(r1.output.computed_at).toBe(T0);
    expect(r2.output.computed_at).toBe(T1);
  });

  it("legal-mode simple: reaches a Conclusion deterministically", () => {
    const fixture = buildLegalSimple();
    const result = compute(inputFrom(fixture, T0));
    const errors = result.validation_results.filter((r) => r.severity === "error");
    expect(errors).toEqual([]);
    expect(result.output.shape === "determinate" || result.output.shape === "conditional").toBe(
      true,
    );
    expect(result.active_path.length).toBeGreaterThan(0);
    expect(result.active_path).toContain("n-root");
    expect(result.active_path).toContain("n-concl");
  });

  it("academic-dispute: produces a valid output with no errors", () => {
    const fixture = buildAcademicDispute();
    const result = compute(inputFrom(fixture, T0));
    const errors = result.validation_results.filter((r) => r.severity === "error");
    expect(errors).toEqual([]);
    expect(result.active_path.length).toBeGreaterThan(0);
  });
});
