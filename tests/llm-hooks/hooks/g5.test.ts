import { describe, it, expect, vi } from "vitest";
import { g5Hook } from "@/llm-hooks/hooks/g5-burden-calibration";
import type { HookContext } from "@/llm-hooks";
import type { Repository } from "@/persistence";

const stubRepo = (): Repository =>
  ({
    loadPrompt: vi.fn().mockResolvedValue(null),
    savePrompt: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Repository;

const makeCtx = (overrides?: Partial<HookContext>): HookContext => ({
  repository: stubRepo(),
  frame_version: {
    id: "fv1",
    frame_id: "f1",
    version_number: 1,
    created_at: "T",
    nodes: [
      {
        id: "rq1",
        type: "RootQuestion",
        statement: "Is standard met?",
        standard_of_review: "clear-and-convincing",
        flavor: "academic",
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  ...overrides,
});

describe("g5Hook — burden_threshold_calibration", () => {
  it("buildInput extracts standard_of_review from RootQuestion", () => {
    const input = g5Hook.buildInput(makeCtx());
    expect(input.standard_of_review).toBe("clear-and-convincing");
  });

  it("buildInput uses jurisdiction region from frame", () => {
    const ctx = makeCtx({
      frame: {
        id: "f1",
        title: "T",
        mode: "legal",
        created_at: "T",
        updated_at: "T",
        current_version_id: "fv1",
        default_satisfaction_policies: {},
        tags: [],
        pinned: false,
        jurisdiction_default: { level: "state", region: "CA" },
      } as never,
    });
    const input = g5Hook.buildInput(ctx);
    expect(input.frame_jurisdiction).toBe("CA");
  });

  it("parseOutput returns ok for valid threshold object", () => {
    const raw = JSON.stringify({
      thresholds: { clear_and_convincing: 75 },
      rationale: "standard practice",
    });
    const result = g5Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok")
      expect(
        (result.value.thresholds as unknown as Record<string, number>)["clear_and_convincing"],
      ).toBe(75);
  });

  it("parseOutput rejects threshold value outside [0,100]", () => {
    const result = g5Hook.parseOutput(
      JSON.stringify({ thresholds: { preponderance: 101 }, rationale: "" }),
      {},
    );
    expect(result.kind).toBe("parse_error");
  });

  it("parseOutput rejects non-object thresholds", () => {
    expect(g5Hook.parseOutput(JSON.stringify({ thresholds: "high" }), {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g5Hook.parseOutput("{bad}", {}).kind).toBe("parse_error");
  });

  it("fallback on provider_error returns no_op", () => {
    const r = g5Hook.fallback(g5Hook.buildInput(makeCtx()), {
      kind: "provider_error",
      name: "P",
      message: "m",
      provider_id: "x",
    } as never);
    expect(r.kind).toBe("no_op");
  });

  it("fallback on parse_error returns advise_user", () => {
    const r = g5Hook.fallback(g5Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit writes calibrated_thresholds", () => {
    const validThresholds = {
      preponderance: 50,
      clear_and_convincing: 75,
      beyond_reasonable_doubt: 90,
      scintilla: 10,
      substantial_evidence: 60,
      source: "g5_calibrated" as const,
    };
    const plan = g5Hook.commit({ thresholds: validThresholds, rationale: "" }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes.some((w) => w.field_path.includes("calibrated_thresholds"))).toBe(true);
  });
});
