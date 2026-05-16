// F-028 regression probes. Every probe in this file SHOULD fail against the
// pre-fix source. Each one fixates a different leg of the same defect family:
//
//   Pattern: "UI dispatches it, modes applies it, persistence stores it,
//   runtime ignores it."
//
// Without the F-028 snapshot, the runtime computed against an empty / inferred
// projection of Frame state, so user edits to default_satisfaction_policies
// and jurisdiction_default were silently inert — and FrameVersion restore
// produced a different output than the version had at write time, breaking
// Article II § 2 determinism.

import { describe, it, expect } from "vitest";
import { runFrameAction, createComputeDriver } from "@/state";
import { frameActions } from "@/modes";
import type {
  Frame,
  FrameVersion,
  ArgumentSession,
  SatisfactionPolicy,
  Jurisdiction,
} from "@/schema";

// makeSessionPair is unused in the active probes (the live tests use
// buildLegalSimple fixtures), but retained so future probes can reuse the
// minimal session shape.
void 0;
import { buildLegalSimple } from "../runtime/_fixtures";

const T0 = "2026-05-10T00:00:00.000Z";
const T1 = "2026-05-10T00:01:00.000Z";

let counter = 0;
function nextId() {
  counter += 1;
  return `gen-${counter}`;
}

function freshDriver() {
  return createComputeDriver({ now: () => T0 });
}

function makeFrameAndVersion(args: {
  mode: "legal" | "general";
  flavor?: "personal" | "academic";
  jurisdiction_default?: Jurisdiction;
  default_satisfaction_policies?: Frame["default_satisfaction_policies"];
}): { frame: Frame; fv: FrameVersion } {
  const frame: Frame = {
    id: "fr-1",
    title: "Frame",
    mode: args.mode,
    flavor: args.flavor,
    jurisdiction_default: args.jurisdiction_default,
    default_satisfaction_policies: args.default_satisfaction_policies ?? {},
    tags: [],
    pinned: false,
    created_at: T0,
    updated_at: T0,
    current_version_id: "fv-1",
  };
  const fv: FrameVersion = {
    id: "fv-1",
    frame_id: "fr-1",
    version_number: 1,
    created_at: T0,
    nodes: [],
    edges: [],
    is_milestone: false,
  };
  return { frame, fv };
}

describe("F-028: runFrameAction snapshots Frame-level compute-affecting fields onto next FrameVersion", () => {
  it("snapshots default_satisfaction_policies onto the minted FrameVersion", () => {
    counter = 0;
    const { frame, fv } = makeFrameAndVersion({ mode: "general", flavor: "academic" });

    const policy: SatisfactionPolicy = {
      all_of: [{ kind: "interpretation_selected" }, { kind: "not_foreclosed" }],
    };
    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "default_policy_edited", node_type: "Term", policy },
      now: T1,
      generateId: nextId,
      dispatch: frameActions,
    });

    expect(result.next_version.default_satisfaction_policies?.Term).toEqual(policy);
    expect(result.next_frame.default_satisfaction_policies.Term).toEqual(policy);
    // The snapshot must equal the post-edit Frame value (not the pre-edit one).
    expect(result.next_version.default_satisfaction_policies).toEqual(
      result.next_frame.default_satisfaction_policies,
    );
  });

  it("snapshots jurisdiction_default onto the minted FrameVersion after metadata_edited", () => {
    counter = 0;
    const { frame, fv } = makeFrameAndVersion({ mode: "legal" });
    const jur: Jurisdiction = { level: "state", region: "CA" };

    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: {
        kind: "metadata_edited",
        partial: { jurisdiction_default: jur },
      },
      now: T1,
      generateId: nextId,
      dispatch: frameActions,
    });

    expect(result.next_version.jurisdiction_default).toEqual(jur);
    expect(result.next_frame.jurisdiction_default).toEqual(jur);
  });

  it("snapshots mode and flavor onto the minted FrameVersion", () => {
    counter = 0;
    const { frame, fv } = makeFrameAndVersion({ mode: "legal" });
    const result = runFrameAction({
      frame,
      current_version: fv,
      patch: { kind: "presentation_hints_reset_all" },
      now: T1,
      generateId: nextId,
      dispatch: frameActions,
    });
    expect(result.next_version.mode).toBe("legal");
    expect(result.next_version.flavor).toBeUndefined();
  });
});

describe("F-028: runtime reads frame_default_policy from FrameVersion snapshot", () => {
  it("FrameVersion-snapshotted default_satisfaction_policies are consulted by computeStatusMap", () => {
    counter = 0;
    const driver = freshDriver();
    const fixture = buildLegalSimple();

    // Baseline: legal-simple fixture, session selects n-interp-a; Term should
    // be satisfied under the library default (`interpretation_selected`).
    const r1 = driver.runFor(fixture.session.session, T0);
    expect(r1.status_map.get("n-term")?.status).toBe("satisfied");

    // Now swap to a strict default that requires authority_binding for Term
    // (a satisfaction kind that won't pass for a Term — authority_required and
    // authority_binding short-circuit fail for non-Checkpoint nodes). The
    // snapshot lives on FrameVersion; the runtime must see it and treat Term
    // as open. Before F-028, the runtime ignored frame defaults and Term
    // remained "satisfied".
    const strict: SatisfactionPolicy = {
      all_of: [{ kind: "interpretation_selected" }, { kind: "authority_required" }],
    };
    const fv_strict: FrameVersion = {
      ...fixture.frame.version,
      default_satisfaction_policies: { Term: strict },
    };
    const session_strict: ArgumentSession = {
      ...fixture.session.session,
      frame_version_snapshot: fv_strict,
    };
    const r2 = driver.runFor(session_strict, T0);
    expect(r2.status_map.get("n-term")?.status).toBe("open");
  });
});

describe("F-028: runtime threads FrameVersion.jurisdiction_default through ComputeInput", () => {
  it("authority_binding sees the snapshotted jurisdiction and returns binding_authority", () => {
    counter = 0;
    const driver = freshDriver();
    const fixture = buildLegalSimple();
    // n-interp-a is CITED by an Authority whose jurisdiction is {state, NY};
    // the FrameVersion-snapshotted jurisdiction_default is the same. Override
    // the Interpretation's per-instance options_box to require
    // authority_binding so the binding chain becomes observable in status.via.
    const bindingPolicy: SatisfactionPolicy = {
      all_of: [{ kind: "authority_binding" }, { kind: "not_foreclosed" }],
    };

    const fv: FrameVersion = {
      ...fixture.frame.version,
      // F-028: explicit snapshot fields the compute driver must thread.
      mode: "legal",
      jurisdiction_default: { level: "state", region: "New York" },
      nodes: fixture.frame.version.nodes.map((n) =>
        n.id === "n-interp-a" ? { ...n, options_box: bindingPolicy } : n,
      ),
    };
    const session: ArgumentSession = {
      ...fixture.session.session,
      frame_version_snapshot: fv,
    };

    const result = driver.runFor(session, T0);
    const interp_status = result.status_map.get("n-interp-a");
    expect(interp_status?.status).toBe("satisfied");
    expect(interp_status?.via).toContain("binding_authority");

    // Comparison probe: drop the snapshotted jurisdiction. Without it,
    // condAuthorityBinding has no default jurisdiction to test against and
    // returns non-binding — the Interpretation's policy fails, status flips
    // away from satisfied.
    const fv_no_jur: FrameVersion = { ...fv, jurisdiction_default: undefined };
    const session_no_jur: ArgumentSession = { ...session, frame_version_snapshot: fv_no_jur };
    const result2 = driver.runFor(session_no_jur, T0);
    const interp_status2 = result2.status_map.get("n-interp-a");
    // Either the via is absent or it does not contain "binding_authority".
    if (interp_status2?.via) {
      expect(interp_status2.via).not.toContain("binding_authority");
    }
    expect(interp_status2?.status).not.toBe("satisfied");
  });
});

describe("F-028: determinism on restore — recomputing a version uses its snapshotted Frame state", () => {
  it("two FrameVersions with different snapshotted defaults compute Term differently", () => {
    counter = 0;
    const driver = freshDriver();
    const fixture = buildLegalSimple();

    // v1: lenient default that passes for Term (only requires
    // interpretation_selected, and the session selects one).
    const lenient: SatisfactionPolicy = {
      all_of: [{ kind: "interpretation_selected" }, { kind: "not_foreclosed" }],
    };
    // v2: strict — requires authority_required (a fail for Term).
    const strict: SatisfactionPolicy = {
      all_of: [{ kind: "interpretation_selected" }, { kind: "authority_required" }],
    };
    const fv1: FrameVersion = {
      ...fixture.frame.version,
      default_satisfaction_policies: { Term: lenient },
    };
    const fv2: FrameVersion = {
      ...fixture.frame.version,
      id: "fv-legal-2",
      version_number: 2,
      parent_version_id: "fv-legal-1",
      default_satisfaction_policies: { Term: strict },
    };

    const s1: ArgumentSession = {
      ...fixture.session.session,
      frame_version_snapshot: fv1,
    };
    const s2: ArgumentSession = {
      ...fixture.session.session,
      frame_version_snapshot: fv2,
    };
    const r1 = driver.runFor(s1, T0);
    const r2 = driver.runFor(s2, T0);
    expect(r1.status_map.get("n-term")?.status).toBe("satisfied");
    expect(r2.status_map.get("n-term")?.status).toBe("open");

    // Determinism: re-running v1 against the same input is byte-identical to
    // the first call (Article II § 2). The compute path consults the snapshot
    // on fv1, not the latest Frame state, so post-edit Frame.default... has
    // no effect here.
    const r1_again = driver.runFor(s1, T0);
    expect(r1_again.status_map.get("n-term")?.status).toBe("satisfied");
  });
});
