import { describe, it, expect, vi } from "vitest";
import { g1Hook } from "@/llm-hooks/hooks/g1-checkpoint-question";
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

describe("g1Hook — checkpoint_question_generation", () => {
  it("buildInput returns valid shape with frame context", () => {
    const ctx = makeCtx({
      frame: {
        id: "f1",
        title: "T",
        mode: "legal",
        flavor: null,
        created_at: "T",
        updated_at: "T",
        current_version_id: "fv1",
        default_satisfaction_policies: {},
        tags: [],
        pinned: false,
        jurisdiction_default: { level: "federal", region: "9th-circuit", court: null },
      } as never,
    });
    const input = g1Hook.buildInput(ctx);
    expect(input.frame_mode).toBe("legal");
    expect(input.frame_jurisdiction).toBe("9th-circuit");
    expect(Array.isArray(input.sibling_checkpoints)).toBe(true);
  });

  it("buildInput defaults to 'general' when frame is absent", () => {
    const input = g1Hook.buildInput(makeCtx());
    expect(input.frame_mode).toBe("general");
    expect(input.frame_jurisdiction).toBeNull();
  });

  it("parseOutput returns ok on valid JSON", () => {
    const raw = JSON.stringify({
      question: "Is the defendant liable?",
      options: [
        { label: "Yes", target_hint: null },
        { label: "No", target_hint: null },
      ],
    });
    const result = g1Hook.parseOutput(raw, {});
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.value.question).toBe("Is the defendant liable?");
      expect(result.value.options).toHaveLength(2);
    }
  });

  it("parseOutput rejects malformed JSON", () => {
    expect(g1Hook.parseOutput("{not json}", {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects question containing 'and'", () => {
    const raw = JSON.stringify({
      question: "Is A and is B?",
      options: [{ label: "Yes" }, { label: "No" }],
    });
    expect(g1Hook.parseOutput(raw, {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects fewer than 2 options", () => {
    const raw = JSON.stringify({ question: "Is X?", options: [{ label: "Yes" }] });
    expect(g1Hook.parseOutput(raw, {}).kind).toBe("parse_error");
  });

  it("parseOutput rejects more than 6 options", () => {
    const options = Array.from({ length: 7 }, (_, i) => ({ label: `Option ${i}` }));
    const raw = JSON.stringify({ question: "Is X?", options });
    expect(g1Hook.parseOutput(raw, {}).kind).toBe("parse_error");
  });

  it("fallback on parse error returns advise_user", () => {
    const result = g1Hook.fallback(g1Hook.buildInput(makeCtx()), {
      kind: "parse_error",
      name: "ParseError",
      message: "bad json",
      raw: "",
    } as never);
    expect(result.kind).toBe("advise_user");
  });

  it("commit writes question and options to the checkpoint node", () => {
    const ctx = makeCtx({ selection: "node-1" as never });
    const plan = g1Hook.commit({ question: "Q?", options: [] }, ctx);
    expect(plan.versioned).toBe(true);
    expect(plan.writes.some((w) => w.field_path === "question")).toBe(true);
  });
});
