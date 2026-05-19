// Re-exports from @/schema (canonical home for these types per the I.2 schema spec):
export type { HookId, LlmSettings, BurdenThresholdMap, HookInvocationRecord } from "@/schema";

import type { Frame, FrameVersion, ArgumentSession, NodeRef, EdgeRef, HookId } from "@/schema";
import type { Repository } from "@/persistence";

export type JsonSchema = unknown;

// ---- Hook contract ----

export interface HookContract<TIn, TOut> {
  id: HookId;
  name: string;
  activation: "build_time" | "output_time" | "runtime_sidecar";
  trigger: "manual" | "automatic" | "manual_with_auto_offer";
  mode_visibility: ModeVisibility;

  buildInput(ctx: HookContext): TIn;
  renderPrompt(input: TIn, prompt: PromptFile): string;
  parseOutput(raw: string, schema: JsonSchema): ParseResult<TOut>;
  fallback(input: TIn, error: ParseError | ProviderError): FallbackResult<TOut>;
  commit(output: TOut, ctx: HookContext): CommitPlan;
}

export interface HookContext {
  repository: Repository;
  /** The Frame entity (provides mode, flavor, jurisdiction for buildInput bodies). */
  frame?: Frame;
  frame_version: FrameVersion;
  session?: ArgumentSession;
  selection?: NodeRef | EdgeRef;
  user_input?: unknown;
}

export type ModeVisibility = {
  legal: boolean;
  general: { personal: boolean; academic: boolean };
};

// ---- Parse / fallback envelopes ----

export type ParseResult<T> =
  | { kind: "ok"; value: T }
  | { kind: "parse_error"; error: ParseError; raw: string };

export type FallbackResult<T> =
  | { kind: "deterministic_fallback"; value: T }
  | { kind: "advise_user"; message: string }
  | { kind: "no_op" };

export class ParseError extends Error {
  readonly kind = "parse_error" as const;
  constructor(
    message: string,
    readonly raw?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

// §12 F-11. A hook may throw from parseOutput when its LLM path is inactive
// (G7/G10/G12 do this) or when an assertion in the parser fires. Without a
// distinct class these throws are caught in runHook and silently wrapped as
// ProviderError, mis-labelling the failure in HookInvocationRecord and routing
// the wrong error type into hook.fallback. ParseAssertError extends ParseError
// so the existing fallback(error: ParseError | ProviderError) signature still
// accepts it.
export class ParseAssertError extends ParseError {
  constructor(message: string, raw?: string) {
    super(message, raw);
    this.name = "ParseAssertError";
  }
}

export class ProviderError extends Error {
  readonly kind = "provider_error" as const;
  constructor(
    message: string,
    readonly provider_id: string,
    readonly underlying?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

// ---- Commit plans ----

export interface CommitPlan {
  writes: FrameFieldWrite[];
  versioned: boolean;
}

export interface FrameFieldWrite {
  target_node_id?: NodeRef;
  target_edge_id?: EdgeRef;
  field_path: string;
  value: unknown;
  op: "set" | "append" | "create_node" | "create_edge";
}

// ---- Suggestion lifecycle ----

export interface SuggestionResult<TOut> {
  hook_id: HookId;
  prompt_name: string;
  prompt_version: string;
  provider_id: string;
  model_id: string;
  input_hash: string;
  /** SHA-256 of the un-rendered prompt body bytes (post-frontmatter Markdown). */
  prompt_body_hash: string;
  /** SHA-256 of the final rendered prompt string sent to the provider. */
  rendered_prompt_hash: string;
  raw_response: string;
  parsed: TOut;
  parse_status: "ok" | "fallback" | "error";
  generated_at: string;
  echo_input?: unknown;
}

export type ConfirmationDecision<TOut> =
  | { kind: "accepted"; final: TOut }
  | { kind: "edited"; final: TOut }
  | { kind: "rejected" };

// ---- Provider abstraction ----

export interface LlmProvider {
  id: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  capabilities: ProviderCapabilities;
}

export interface CompletionRequest {
  prompt: string;
  output_schema: JsonSchema;
  model_hint?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  raw_text: string;
  model_id: string;
  finish_reason: "stop" | "length" | "error";
  token_usage?: { input: number; output: number };
}

export interface ProviderCapabilities {
  structured_output: boolean;
  streaming: boolean;
  tool_use: boolean;
}

// ---- Prompt file ----

export interface PromptFile {
  hook_name: string;
  version: string;
  schema_in: JsonSchema;
  schema_out: JsonSchema;
  model_hint?: string;
  provider_hints?: Record<string, unknown>;
  body: string;
  created_at?: string;
  notes?: string;
}

// ---- Dependency injection for tests ----

export interface LlmHooksDeps {
  now?: () => string;
  generateId?: () => string;
  cryptoSubtle?: SubtleCrypto;
}
