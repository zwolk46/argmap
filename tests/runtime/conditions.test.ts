import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluatePolicy } from "@/runtime/conditions";
import { buildLegalWithCheckpoint } from "./_fixtures";
import type { Condition, NodeRef, NodeStatus, SatisfactionPolicy } from "@/schema";

function emptyMap(): ReadonlyMap<NodeRef, NodeStatus> {
  return new Map<NodeRef, NodeStatus>();
}

describe("evaluateCondition — premise_attached", () => {
  it("passes when ANSWERS edge targets the Checkpoint", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "premise_attached" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
  });

  it("fails on non-Checkpoint nodes", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const root = frame.version.nodes.find((n) => n.type === "RootQuestion")!;
    expect(
      evaluateCondition(
        { kind: "premise_attached" },
        root,
        frame.version,
        session.session,
        emptyMap(),
      ).passed,
    ).toBe(false);
  });
});

describe("evaluateCondition — burden_met (F-001 calibrated thresholds)", () => {
  it("with default thresholds (no snapshot), one stipulated premise satisfies preponderance", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "burden_met", level: "preponderance" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
    expect(r.via).toContain("stipulation");
  });

  it("with calibrated threshold raised above stipulated weight, condition fails", () => {
    const { frame, session } = buildLegalWithCheckpoint({
      premiseKind: "found",
      calibrated_threshold: 95,
    });
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "burden_met", level: "preponderance" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(false);
  });

  it("contradicting premises subtract from the score", () => {
    const { frame, session } = buildLegalWithCheckpoint({ contradictPremise: true });
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "burden_met", level: "clear_and_convincing" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(false);
  });
});

describe("evaluateCondition — not_contradicted", () => {
  it("fails when any CONTRADICTS edge targets the node", () => {
    const { frame, session } = buildLegalWithCheckpoint({ contradictPremise: true });
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "not_contradicted" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(false);
  });

  it("passes when no CONTRADICTS edges target the node", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "not_contradicted" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
  });
});

describe("evaluateCondition — premise_kind_in", () => {
  it("passes when an attached premise's kind is in the allowed set", () => {
    const { frame, session } = buildLegalWithCheckpoint({ premiseKind: "stipulated" });
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "premise_kind_in", kinds: ["stipulated", "found"] },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
  });

  it("fails when no attached premise's kind matches", () => {
    const { frame, session } = buildLegalWithCheckpoint({ premiseKind: "disputed" });
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "premise_kind_in", kinds: ["stipulated"] },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(false);
  });
});

describe("evaluateCondition — authority_required", () => {
  it("passes when the answering premise has authority_ref", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const r = evaluateCondition(
      { kind: "authority_required" },
      cp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
  });
});

describe("evaluateCondition — not_distinguished", () => {
  it("passes when no DISTINGUISHED_BY edge targets the node", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const interp = frame.version.nodes.find((n) => n.type === "Interpretation")!;
    const r = evaluateCondition(
      { kind: "not_distinguished" },
      interp,
      frame.version,
      session.session,
      emptyMap(),
    );
    expect(r.passed).toBe(true);
  });
});

describe("evaluateCondition — not_foreclosed (pass-when-reached)", () => {
  it("always passes when condition is evaluated", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    expect(
      evaluateCondition({ kind: "not_foreclosed" }, cp, frame.version, session.session, emptyMap())
        .passed,
    ).toBe(true);
  });
});

describe("evaluatePolicy", () => {
  it("all_of passes when every condition passes", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const policy: SatisfactionPolicy = {
      all_of: [
        { kind: "premise_attached" },
        { kind: "not_contradicted" },
        { kind: "burden_met", level: "preponderance" },
      ],
    };
    const r = evaluatePolicy(policy, cp, frame.version, session.session, emptyMap());
    expect(r.passed).toBe(true);
    expect(r.failed.length).toBe(0);
  });

  it("all_of fails and `failed` lists the failed kinds", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const policy: SatisfactionPolicy = {
      all_of: [
        { kind: "premise_attached" },
        { kind: "burden_met", level: "beyond_reasonable_doubt" },
      ],
    };
    const r = evaluatePolicy(policy, cp, frame.version, session.session, emptyMap());
    expect(r.passed).toBe(false);
    expect(r.failed).toContain("burden_met");
  });

  it("any_of group: one passing condition is enough", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const failingCond: Condition = { kind: "burden_met", level: "beyond_reasonable_doubt" };
    const passingCond: Condition = { kind: "premise_attached" };
    const policy: SatisfactionPolicy = {
      all_of: [],
      any_of: [failingCond, passingCond],
    };
    const r = evaluatePolicy(policy, cp, frame.version, session.session, emptyMap());
    expect(r.passed).toBe(true);
  });

  it("any_of group: all fail → 'any_of_group_unsatisfied'", () => {
    const { frame, session } = buildLegalWithCheckpoint();
    const cp = frame.version.nodes.find((n) => n.type === "Checkpoint")!;
    const policy: SatisfactionPolicy = {
      all_of: [],
      any_of: [{ kind: "burden_met", level: "beyond_reasonable_doubt" }],
    };
    const r = evaluatePolicy(policy, cp, frame.version, session.session, emptyMap());
    expect(r.passed).toBe(false);
    expect(r.failed).toContain("any_of_group_unsatisfied");
  });
});
