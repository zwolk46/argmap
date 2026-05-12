import type { LlmProvider, ProviderCapabilities } from "../types";
import { AnthropicProvider, type AnthropicProviderConfig } from "./anthropic";
import { MockLlmProvider, type MockProviderConfig } from "./mock";

export type ProviderConfig =
  | { provider_id: "anthropic"; config: AnthropicProviderConfig }
  | { provider_id: "mock"; config: MockProviderConfig };

export function createProvider(spec: ProviderConfig): LlmProvider {
  switch (spec.provider_id) {
    case "anthropic":
      return new AnthropicProvider(spec.config);
    case "mock":
      return new MockLlmProvider(spec.config);
  }
}

export const PROVIDER_CAPABILITIES: Readonly<Record<string, ProviderCapabilities>> = Object.freeze({
  anthropic: { structured_output: false, streaming: false, tool_use: false },
  mock: { structured_output: false, streaming: false, tool_use: false },
});

export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "./anthropic";
export { MockLlmProvider, UnexpectedPromptError } from "./mock";
