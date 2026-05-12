import { describe, it, expect, vi } from "vitest";
import { runHook, applyDecision, MockLlmProvider } from "@/llm-hooks";
import type { HookContract, HookContext, CommitPlan } from "@/llm-hooks";
import type { Repository, PromptFileRecord } from "@/persistence";

// A PromptFileRecord (persistence layer shape) for hook "test_hook" v1
const fakeRecord = (): PromptFileRecord => ({
  hook_name: "test_hook",
  version: "v1",
  body_markdown: "Prompt: {{value}}",
  frontmatter: {
    hook_name: "test_hook",
    version: "v1",
    schema_in: {},
    schema_out: {},
    model_hint: "test-model",
  },
  added_at: "2026-01-01T00:00:00Z",
});

const stubRepo = (): Repository =>
  ({
    loadPrompt: vi.fn().mockResolvedValue(fakeRecord()),
    savePrompt: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Repository;

const makeCtx = (): HookContext => ({
  repository: stubRepo(),
  frame_version: {
    id: "fv1",
    frame_id: "f1",
    version_number: 1,
    created_at: "2026-01-01T00:00:00Z",
    nodes: [],
    edges: [],
    is_milestone: false,
  },
});

const makeHook = (): HookContract<{ value: string }, { result: string }> => ({
  id: "G1",
  name: "test_hook",
  activation: "build_time",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },
  buildInput: () => ({ value: "test" }),
  renderPrompt: (input, prompt) => prompt.body.replace("{{value}}", input.value),
  parseOutput: (raw) => {
    try {
      const p = JSON.parse(raw) as { result: string };
      return { kind: "ok", value: p };
    } catch {
      return {
        kind: "parse_error",
        error: { kind: "parse_error", name: "ParseError", message: "bad json", raw } as never,
        raw,
      };
    }
  },
  fallback: () => ({ kind: "deterministic_fallback", value: { result: "fallback" } }),
  commit: (output) => ({
    writes: [{ field_path: "x", value: output.result, op: "set" }],
    versioned: true,
  }),
});

describe("runHook", () => {
  it("returns SuggestionResult with parse_status 'ok' on happy path", async () => {
    const hook = makeHook();
    const promptText = "Prompt: test";
    const responseHash = await MockLlmProvider.keyFor(promptText, "test-model");
    const provider = new MockLlmProvider({
      responses: new Map([
        [
          responseHash,
          { raw_text: '{"result":"ok-result"}', model_id: "test-model", finish_reason: "stop" },
        ],
      ]),
    });

    const ctx = makeCtx();
    const result = await runHook(
      hook,
      ctx,
      provider,
      { prompt_version: "v1" },
      {
        now: () => "2026-01-01T00:00:00Z",
        generateId: () => "id-1",
      },
    );

    expect(result.hook_id).toBe("G1");
    expect(result.parse_status).toBe("ok");
    expect((result.parsed as { result: string }).result).toBe("ok-result");
  });

  it("routes to fallback on provider error", async () => {
    const hook = makeHook();
    const provider = new MockLlmProvider({
      responses: new Map(), // no matching response → UnexpectedPromptError
    });

    const ctx = makeCtx();
    const result = await runHook(
      hook,
      ctx,
      provider,
      { prompt_version: "v1" },
      {
        now: () => "2026-01-01T00:00:00Z",
        generateId: () => "id-2",
      },
    );

    // deterministic_fallback always yields parse_status "fallback" regardless of error source
    expect(result.parse_status).toBe("fallback");
    expect(result.parsed).toEqual({ result: "fallback" });
  });

  it("records the provider_id in the result", async () => {
    const hook = makeHook();
    const promptText = "Prompt: test";
    const responseHash = await MockLlmProvider.keyFor(promptText, "test-model");
    const provider = new MockLlmProvider({
      id: "my-mock",
      responses: new Map([
        [
          responseHash,
          { raw_text: '{"result":"r"}', model_id: "test-model", finish_reason: "stop" },
        ],
      ]),
    });
    const ctx = makeCtx();
    const result = await runHook(hook, ctx, provider, { prompt_version: "v1" });
    expect(result.provider_id).toBe("my-mock");
  });
});

describe("applyDecision", () => {
  it("rejected decision produces empty CommitPlan", () => {
    const hook = makeHook();
    const suggestion = {
      hook_id: "G1" as const,
      prompt_name: "test_hook",
      prompt_version: "v1",
      provider_id: "mock",
      model_id: "m",
      input_hash: "h",
      raw_response: "r",
      parsed: { result: "x" },
      parse_status: "ok" as const,
      generated_at: "T",
    };
    const { commit_plan } = applyDecision(hook, suggestion, { kind: "rejected" }, makeCtx(), {
      now: () => "T",
      generateId: () => "id",
    });
    expect(commit_plan.writes).toHaveLength(0);
    expect(commit_plan.versioned).toBe(false);
  });

  it("accepted decision routes through hook.commit", () => {
    const hook = makeHook();
    const suggestion = {
      hook_id: "G1" as const,
      prompt_name: "test_hook",
      prompt_version: "v1",
      provider_id: "mock",
      model_id: "m",
      input_hash: "h",
      raw_response: "r",
      parsed: { result: "accepted-value" },
      parse_status: "ok" as const,
      generated_at: "T",
    };
    const { commit_plan, invocation_record } = applyDecision(
      hook,
      suggestion,
      { kind: "accepted", final: { result: "accepted-value" } },
      makeCtx(),
      { now: () => "T", generateId: () => "rec-id" },
    );
    const plan = commit_plan as CommitPlan;
    expect(plan.writes[0]?.value).toBe("accepted-value");
    expect(invocation_record.decision).toBe("accepted");
    expect(invocation_record.id).toBe("rec-id");
  });
});
