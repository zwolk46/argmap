import { describe, it, expect } from "vitest";
import { compute } from "@/runtime";
import { GATE_NOT_SATISFIED_MARKER } from "@/runtime/gates";
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

describe("computeStatusMap (via compute)", () => {
  it("Premise nodes receive no status (map omits them)", () => {
    const fixture = buildLegalWithCheckpoint();
    const r = compute(inputFrom(fixture, T0));
    for (const p of fixture.session.session.premises) {
      expect(r.status_map.has(p.id)).toBe(false);
    }
  });

  it("Authority nodes receive no status", () => {
    const fixture = buildLegalSimple();
    const r = compute(inputFrom(fixture, T0));
    const auth = fixture.frame.version.nodes.find((n) => n.type === "Authority");
    expect(auth).toBeDefined();
    if (auth) expect(r.status_map.has(auth.id)).toBe(false);
  });

  it("inactive nodes receive status:not_applicable", () => {
    const fixture = buildLegalSimple();
    const r = compute(inputFrom(fixture, T0));
    // Interp B is not selected → not in active set → not_applicable.
    const sb = r.status_map.get("n-interp-b");
    expect(sb?.status).toBe("not_applicable");
  });

  it("every NodeStatus carries evaluated_at === input computed_at", () => {
    const fixture = buildLegalSimple();
    const r = compute(inputFrom(fixture, T0));
    let any = false;
    for (const pair of r.status_map) {
      any = true;
      expect(pair[1].evaluated_at).toBe(T0);
    }
    expect(any).toBe(true);
  });

  it("contested heuristic: contradicting premise → status:contested with 'contradicting_premises'", () => {
    const fixture = buildLegalWithCheckpoint({ contradictPremise: true });
    const r = compute(inputFrom(fixture, T0));
    const cpStatus = r.status_map.get("n-cp");
    expect(cpStatus?.status).toBe("contested");
    expect(cpStatus?.failed_conditions).toContain("contradicting_premises");
  });

  it("GATE_NOT_SATISFIED_MARKER is exported as a constant", () => {
    expect(typeof GATE_NOT_SATISFIED_MARKER).toBe("string");
    expect(GATE_NOT_SATISFIED_MARKER).toBe("gate_evaluated_not_satisfied");
  });
});
