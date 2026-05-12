import { describe, it, expect } from "vitest";
import { MockLlmProvider, UnexpectedPromptError } from "@/llm-hooks/providers/mock";

describe("MockLlmProvider", () => {
  it("returns a configured response for a matching prompt hash", async () => {
    const prompt = "Hello world";
    const model = "test-model";
    const key = await MockLlmProvider.keyFor(prompt, model);
    const provider = new MockLlmProvider({
      responses: new Map([[key, { raw_text: "ok", model_id: model, finish_reason: "stop" }]]),
    });
    const result = await provider.complete({ prompt, model_hint: model, output_schema: {} });
    expect(result.raw_text).toBe("ok");
    expect(result.finish_reason).toBe("stop");
  });

  it("throws UnexpectedPromptError for a prompt not in the map", async () => {
    const provider = new MockLlmProvider({ responses: new Map() });
    await expect(
      provider.complete({ prompt: "unknown", model_hint: "m", output_schema: {} }),
    ).rejects.toBeInstanceOf(UnexpectedPromptError);
  });

  it("re-throws a configured Error response", async () => {
    const prompt = "failing prompt";
    const key = await MockLlmProvider.keyFor(prompt, "m");
    const provider = new MockLlmProvider({
      responses: new Map([[key, new Error("provider down")]]),
    });
    await expect(provider.complete({ prompt, model_hint: "m", output_schema: {} })).rejects.toThrow(
      "provider down",
    );
  });

  it("keyFor is stable across calls", async () => {
    const a = await MockLlmProvider.keyFor("p", "m");
    const b = await MockLlmProvider.keyFor("p", "m");
    expect(a).toBe(b);
  });

  it("keyFor differs for different prompts", async () => {
    const a = await MockLlmProvider.keyFor("p1", "m");
    const b = await MockLlmProvider.keyFor("p2", "m");
    expect(a).not.toBe(b);
  });

  it("keyFor differs for different model hints", async () => {
    const a = await MockLlmProvider.keyFor("p", "m1");
    const b = await MockLlmProvider.keyFor("p", "m2");
    expect(a).not.toBe(b);
  });

  it("exposes id and capabilities", () => {
    const provider = new MockLlmProvider({ responses: new Map(), id: "my-mock" });
    expect(provider.id).toBe("my-mock");
    expect(provider.capabilities.streaming).toBe(false);
  });

  it("defaults id to 'mock' when not specified", () => {
    const provider = new MockLlmProvider({ responses: new Map() });
    expect(provider.id).toBe("mock");
  });
});
