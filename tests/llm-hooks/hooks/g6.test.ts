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
  it("buildInput uses user_input as baseline_prose when given a string (legacy contract)", () => {
    const input = g6Hook.buildInput(makeCtx());
    expect(input.baseline_prose).toBe("The court held the act unconstitutional.");
    expect(input.baseline_kind).toBe("canonical");
  });

  it("buildInput reads baseline + baseline_kind from a structured payload (F-10)", () => {
    const refine = g6Hook.buildInput(
      makeCtx({ user_input: { baseline: "Polished draft.", baseline_kind: "rewrite" } }),
    );
    expect(refine.baseline_prose).toBe("Polished draft.");
    expect(refine.baseline_kind).toBe("rewrite");
    const fresh = g6Hook.buildInput(
      makeCtx({ user_input: { baseline: "Canonical draft.", baseline_kind: "canonical" } }),
    );
    expect(fresh.baseline_prose).toBe("Canonical draft.");
    expect(fresh.baseline_kind).toBe("canonical");
  });

  it("buildInput defaults baseline_kind to 'canonical' and baseline to '' for malformed input (F-10)", () => {
    // Previously `String({canonical: "x"})` would silently produce "[object Object]";
    // the F-10 fix replaces that with explicit baseline + baseline_kind parsing.
    const garbage = g6Hook.buildInput(makeCtx({ user_input: { canonical: "x" } }));
    expect(garbage.baseline_prose).toBe("");
    expect(garbage.baseline_kind).toBe("canonical");
    const undef = g6Hook.buildInput(makeCtx({ user_input: undefined }));
    expect(undef.baseline_prose).toBe("");
    expect(undef.baseline_kind).toBe("canonical");
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
