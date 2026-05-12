import { describe, it, expect, vi } from "vitest";
import { g10Hook } from "@/llm-hooks/hooks/g10-frame-template-ranking";
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
        statement: "Is the statute constitutional?",
        flavor: "academic",
      } as never,
    ],
    edges: [],
    is_milestone: false,
  },
  ...overrides,
});

describe("g10Hook — frame_template_ranking (deterministic fallback only)", () => {
  it("buildInput extracts topic from RootQuestion", () => {
    const input = g10Hook.buildInput(makeCtx());
    expect(input.topic).toBe("Is the statute constitutional?");
  });

  it("fallback ranks by Jaccard similarity of tags to topic tokens", () => {
    const input = {
      topic: "statute constitutional",
      candidate_frames: [
        { id: "f1" as never, title: "Constitutional Review", tags: ["constitutional", "statute"] },
        { id: "f2" as never, title: "Contract Analysis", tags: ["contract", "offer"] },
      ],
      frame_mode: "legal" as const,
    };
    const dummyErr = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g10Hook.fallback(input, dummyErr);
    expect(result.kind).toBe("deterministic_fallback");
    if (result.kind === "deterministic_fallback") {
      expect(result.value.ranking[0]?.frame_id).toBe("f1");
    }
  });

  it("fallback returns stable order when scores tie (lexicographic by frame_id)", () => {
    const input = {
      topic: "unrelated",
      candidate_frames: [
        { id: "z" as never, title: "Z frame", tags: [] },
        { id: "a" as never, title: "A frame", tags: [] },
      ],
      frame_mode: "general" as const,
    };
    const dummyErr = { kind: "parse_error" as const, name: "P", message: "m", raw: "" } as never;
    const result = g10Hook.fallback(input, dummyErr);
    if (result.kind === "deterministic_fallback") {
      expect(result.value.ranking[0]?.frame_id).toBe("a");
    }
  });

  it("parseOutput throws (LLM path not active in v1)", () => {
    expect(() => g10Hook.parseOutput("x", {})).toThrow();
  });

  it("commit returns versioned:false empty plan", () => {
    const plan = g10Hook.commit({ ranking: [] }, makeCtx());
    expect(plan.versioned).toBe(false);
    expect(plan.writes).toHaveLength(0);
  });
});
