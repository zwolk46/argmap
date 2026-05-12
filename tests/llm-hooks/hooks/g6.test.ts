import { describe, it, expect, vi } from "vitest";
import { g6Hook } from "@/llm-hooks/hooks/g6-prose-rewrite";
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
    nodes: [],
    edges: [],
    is_milestone: false,
  },
  user_input: "The court held the act unconstitutional.",
  ...overrides,
});

describe("g6Hook — prose_rewrite", () => {
  it("buildInput uses user_input as baseline_prose", () => {
    const input = g6Hook.buildInput(makeCtx());
    expect(input.baseline_prose).toBe("The court held the act unconstitutional.");
  });

  it("parseOutput returns ok for valid response", () => {
    const raw = JSON.stringify({
      rewritten_prose: "The court declared the statute invalid under the First Amendment.",
    });
    const result = g6Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.rewritten_prose).toContain("invalid");
  });

  it("parseOutput rejects empty rewritten_prose", () => {
    expect(g6Hook.parseOutput(JSON.stringify({ rewritten_prose: "   " }), {}).kind).toBe(
      "parse_error",
    );
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g6Hook.parseOutput("garbage", {}).kind).toBe("parse_error");
  });

  it("fallback returns advise_user", () => {
    const r = g6Hook.fallback(g6Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "P",
      message: "m",
      raw: "",
    } as never);
    expect(r.kind).toBe("advise_user");
  });

  it("commit writes output_overrides.rewritten_prose", () => {
    const plan = g6Hook.commit({ rewritten_prose: "Rewritten." }, makeCtx());
    expect(plan.versioned).toBe(true);
    expect(plan.writes[0]?.field_path).toBe("output_overrides.rewritten_prose");
  });
});
