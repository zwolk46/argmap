import { describe, it, expect, vi } from "vitest";
import { g3Hook } from "@/llm-hooks/hooks/g3-conclusion-reasoning";
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
        id: "c1",
        type: "Conclusion",
        statement: "Defendant is liable.",
        direction: "affirm",
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  selection: "c1" as never,
  ...overrides,
});

describe("g3Hook — conclusion_reasoning_summary", () => {
  it("buildInput captures conclusion statement", () => {
    const input = g3Hook.buildInput(makeCtx());
    expect(input.conclusion.statement).toBe("Defendant is liable.");
  });

  it("parseOutput returns ok for short valid summary", () => {
    const raw = JSON.stringify({
      reasoning_summary: "The court found liability based on proximate cause.",
    });
    const result = g3Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.reasoning_summary).toContain("liability");
  });

  it("parseOutput rejects empty string", () => {
    expect(g3Hook.parseOutput(JSON.stringify({ reasoning_summary: "" }), {}).kind).toBe(
      "parse_error",
    );
  });

  it("parseOutput rejects summaries over 120 words", () => {
    const longSummary = Array.from({ length: 121 }, (_, i) => `word${i}`).join(" ");
    const result = g3Hook.parseOutput(JSON.stringify({ reasoning_summary: longSummary }), {});
    expect(result.kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g3Hook.parseOutput("{bad}", {}).kind).toBe("parse_error");
  });

  it("fallback on parse_error returns advise_user", () => {
    const r = g3Hook.fallback(g3Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("fallback on provider_error returns no_op", () => {
    const r = g3Hook.fallback(g3Hook.buildInput(makeCtx()), {
      kind: "provider_error",
      name: "P",
      message: "m",
      provider_id: "x",
    } as never);
    expect(r.kind).toBe("no_op");
  });

  it("commit writes reasoning_summary field", () => {
    const plan = g3Hook.commit({ reasoning_summary: "Summary." }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes[0]?.field_path).toBe("reasoning_summary");
  });
});
