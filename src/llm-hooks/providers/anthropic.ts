import Anthropic from "@anthropic-ai/sdk";
import type {
  LlmProvider,
  CompletionRequest,
  CompletionResponse,
  ProviderCapabilities,
} from "../types";
import { ProviderError } from "../types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-3-7-sonnet-latest";

export interface AnthropicProviderConfig {
  api_key: string;
  default_model?: string;
  base_url?: string;
}

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly capabilities: ProviderCapabilities = {
    structured_output: false,
    streaming: false,
    tool_use: false,
  };
  private readonly client: Anthropic;
  private readonly default_model: string;

  constructor(config: AnthropicProviderConfig) {
    this.client = new Anthropic({ apiKey: config.api_key, baseURL: config.base_url });
    this.default_model = config.default_model ?? DEFAULT_ANTHROPIC_MODEL;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const model = req.model_hint ?? this.default_model;
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: req.max_tokens ?? 1024,
        temperature: req.temperature ?? 0.2,
        messages: [{ role: "user", content: req.prompt }],
      });
      const raw_text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      return {
        raw_text,
        model_id: response.model,
        finish_reason:
          response.stop_reason === "end_turn"
            ? "stop"
            : response.stop_reason === "max_tokens"
              ? "length"
              : "stop",
        token_usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (err) {
      throw new ProviderError(
        `Anthropic provider error: ${(err as Error).message}`,
        "anthropic",
        err,
      );
    }
  }
}
