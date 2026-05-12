import { describe, it, expect, vi } from "vitest";
import { g7Hook } from "@/llm-hooks/hooks/g7-premise-reuse-ranking";
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
      { id: "p1", type: "Premise", statement: "Statute is ambiguous.", kind: "factual" } as never,
      { id: "p2", type: "Premise", statement: "Court has jurisdiction.", kind: "legal" } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  user_input: "The law is unclear",
  selection: "cp1" as never,
  ...overrides,
});

describe("g7Hook — premise_reuse_ranking (deterministic fallback only)", () => {
  it("buildInput includes all Premise nodes sorted by id", () => {
    const input = g7Hook.buildInput(makeCtx());
    expect(input.candidate_premises.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("fallback returns deterministic_fallback with sorted ranking", () => {
    const input = g7Hook.buildInput(makeCtx());
    const dummyError = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g7Hook.fallback(input, dummyError);
    expect(result.kind).toBe("deterministic_fallback");
    if (result.kind === "deterministic_fallback") {
      const ids = result.value.ranking.map((r) => r.premise_id);
      expect(ids).toEqual([...ids].sort());
    }
  });

  it("fallback assigns score 0 to all premises in v1", () => {
    const input = g7Hook.buildInput(makeCtx());
    const dummyError = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g7Hook.fallback(input, dummyError);
    if (result.kind === "deterministic_fallback") {
      expect(result.value.ranking.every((r) => r.score === 0)).toBe(true);
    }
  });

  it("parseOutput throws (LLM path not active in v1)", () => {
    expect(() => g7Hook.parseOutput("anything", {})).toThrow();
  });

  it("commit returns versioned:false empty plan", () => {
    const plan = g7Hook.commit({ ranking: [] }, makeCtx());
    expect(plan.versioned).toBe(false);
    expect(plan.writes).toHaveLength(0);
  });
});
