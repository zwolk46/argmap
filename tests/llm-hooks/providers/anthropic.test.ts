import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "@/llm-hooks/providers/anthropic";
import { ProviderError } from "@/llm-hooks";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({
    messages: { create: mockCreate },
  })),
}));

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes id='anthropic' and capabilities", () => {
    const p = new AnthropicProvider({ api_key: "k" });
    expect(p.id).toBe("anthropic");
    expect(p.capabilities.streaming).toBe(false);
    expect(p.capabilities.structured_output).toBe(false);
    expect(p.capabilities.tool_use).toBe(false);
  });

  it("uses DEFAULT_ANTHROPIC_MODEL when model_hint is absent", async () => {
    mockCreate.mockResolvedValue({
      model: DEFAULT_ANTHROPIC_MODEL,
      stop_reason: "end_turn",
      content: [{ type: "text", text: "result" }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    const p = new AnthropicProvider({ api_key: "k" });
    const res = await p.complete({ prompt: "hello", output_schema: {} });
    expect(mockCreate.mock.calls[0][0].model).toBe(DEFAULT_ANTHROPIC_MODEL);
    expect(res.raw_text).toBe("result");
    expect(res.finish_reason).toBe("stop");
  });

  it("prefers model_hint over default model", async () => {
    mockCreate.mockResolvedValue({
      model: "claude-custom",
      stop_reason: "end_turn",
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const p = new AnthropicProvider({ api_key: "k" });
    await p.complete({ prompt: "hi", model_hint: "claude-custom", output_schema: {} });
    expect(mockCreate.mock.calls[0][0].model).toBe("claude-custom");
  });

  it("maps stop_reason='max_tokens' to finish_reason='length'", async () => {
    mockCreate.mockResolvedValue({
      model: DEFAULT_ANTHROPIC_MODEL,
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "truncated" }],
      usage: { input_tokens: 5, output_tokens: 1024 },
    });
    const p = new AnthropicProvider({ api_key: "k" });
    const res = await p.complete({ prompt: "long", output_schema: {} });
    expect(res.finish_reason).toBe("length");
  });

  it("wraps SDK errors in ProviderError", async () => {
    mockCreate.mockRejectedValue(new Error("network failure"));
    const p = new AnthropicProvider({ api_key: "k" });
    await expect(p.complete({ prompt: "fail", output_schema: {} })).rejects.toBeInstanceOf(
      ProviderError,
    );
  });

  it("joins multiple text blocks into a single raw_text", async () => {
    mockCreate.mockResolvedValue({
      model: DEFAULT_ANTHROPIC_MODEL,
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "part1 " },
        { type: "text", text: "part2" },
      ],
      usage: { input_tokens: 3, output_tokens: 3 },
    });
    const p = new AnthropicProvider({ api_key: "k" });
    const res = await p.complete({ prompt: "multi", output_schema: {} });
    expect(res.raw_text).toBe("part1 part2");
  });
});
