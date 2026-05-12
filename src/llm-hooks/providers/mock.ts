import type {
  LlmProvider,
  CompletionRequest,
  CompletionResponse,
  ProviderCapabilities,
} from "../types";
import { hashCanonical, canonicalize, type ProvenanceDeps } from "../provenance";

export class UnexpectedPromptError extends Error {
  readonly kind = "unexpected_prompt" as const;
  constructor(
    readonly prompt_hash: string,
    readonly prompt_preview: string,
  ) {
    super(`MockLlmProvider received an unexpected prompt (hash ${prompt_hash}): ${prompt_preview}`);
    this.name = "UnexpectedPromptError";
  }
}

export interface MockProviderConfig {
  responses: Map<string, CompletionResponse | Error>;
  deps?: ProvenanceDeps;
  id?: string;
}

export class MockLlmProvider implements LlmProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities = {
    structured_output: false,
    streaming: false,
    tool_use: false,
  };
  private readonly responses: Map<string, CompletionResponse | Error>;
  private readonly deps: ProvenanceDeps;

  constructor(config: MockProviderConfig) {
    this.id = config.id ?? "mock";
    this.responses = config.responses;
    this.deps = config.deps ?? {};
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const canonical = canonicalize({ model_hint: req.model_hint, prompt: req.prompt });
    const hash = await hashCanonical(canonical, this.deps);
    const hit = this.responses.get(hash);
    if (hit instanceof Error) throw hit;
    if (!hit) throw new UnexpectedPromptError(hash, req.prompt.slice(0, 80));
    return hit;
  }

  static async keyFor(prompt: string, model_hint?: string, deps?: ProvenanceDeps): Promise<string> {
    return hashCanonical(canonicalize({ model_hint, prompt }), deps ?? {});
  }
}
