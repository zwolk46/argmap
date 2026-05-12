import { describe, it, expect, vi } from "vitest";
import { g12Hook } from "@/llm-hooks/hooks/g12-cross-implications";
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
  session: {
    id: "s1",
    frame_id: "f1",
    created_at: "T",
    current_version_id: "sv1",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
  } as never,
  selection: "node-1" as never,
  ...overrides,
});

describe("g12Hook — cross_implications (deterministic fallback only)", () => {
  it("buildInput builds a valid ArgumentSessionVersion stub", () => {
    const input = g12Hook.buildInput(makeCtx());
    expect(input.session_state.session_id).toBe("s1");
    expect(input.session_state.is_milestone).toBe(false);
  });

  it("buildInput uses frame_version reference", () => {
    const input = g12Hook.buildInput(makeCtx());
    expect(input.frame_version.id).toBe("fv1");
  });

  it("fallback returns deterministic_fallback with empty advisories", () => {
    const input = g12Hook.buildInput(makeCtx());
    const dummyErr = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g12Hook.fallback(input, dummyErr);
    expect(result.kind).toBe("deterministic_fallback");
    if (result.kind === "deterministic_fallback") {
      expect(result.value.advisories).toHaveLength(0);
    }
  });

  it("parseOutput throws (LLM path not active in v1)", () => {
    expect(() => g12Hook.parseOutput("x", {})).toThrow();
  });

  it("commit returns versioned:false empty plan", () => {
    const plan = g12Hook.commit({ advisories: [] }, makeCtx());
    expect(plan.versioned).toBe(false);
    expect(plan.writes).toHaveLength(0);
  });
});
