import { describe, it, expect, vi } from "vitest";
import { g4Hook } from "@/llm-hooks/hooks/g4-gap-detection";
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
  ...overrides,
});

describe("g4Hook — gap_detection", () => {
  it("buildInput includes frame_version reference", () => {
    const ctx = makeCtx();
    const input = g4Hook.buildInput(ctx);
    expect(input.frame_version.id).toBe("fv1");
  });

  it("parseOutput returns ok with advisory array", () => {
    const raw = JSON.stringify({ advisories: [{ code: "G001", message: "Missing premise" }] });
    const result = g4Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.advisories).toHaveLength(1);
  });

  it("parseOutput caps at 8 advisories", () => {
    const advisories = Array.from({ length: 12 }, (_, i) => ({ code: `G${i}`, message: "x" }));
    const result = g4Hook.parseOutput(JSON.stringify({ advisories }), {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.advisories).toHaveLength(8);
  });

  it("parseOutput rejects non-array advisories", () => {
    expect(g4Hook.parseOutput(JSON.stringify({ advisories: "oops" }), {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects non-JSON", () => {
    expect(g4Hook.parseOutput("not json", {}).kind).toBe("parse_error");
  });

  it("fallback returns no_op", () => {
    const r = g4Hook.fallback(g4Hook.buildInput(makeCtx()), { kind: "parse_error" } as never);
    expect(r.kind).toBe("no_op");
  });

  it("commit returns empty versioned:false plan", () => {
    const plan = g4Hook.commit({ advisories: [] }, makeCtx());
    expect(plan.versioned).toBe(false);
    expect(plan.writes).toHaveLength(0);
  });
});
