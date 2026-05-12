import type {
  HookContract,
  HookContext,
  LlmProvider,
  SuggestionResult,
  ConfirmationDecision,
  CommitPlan,
  HookInvocationRecord,
  LlmHooksDeps,
  ParseResult,
  FallbackResult,
} from "./types";
import { ProviderError } from "./types";
import { loadPrompt } from "./prompt-loader";
import { canonicalize, hashCanonical, buildInvocationRecord } from "./provenance";

export interface RunHookOptions {
  prompt_version: string;
  max_tokens?: number;
  temperature?: number;
}

export async function runHook<TIn, TOut>(
  hook: HookContract<TIn, TOut>,
  context: HookContext,
  provider: LlmProvider,
  options: RunHookOptions,
  deps: LlmHooksDeps = {},
): Promise<SuggestionResult<TOut>> {
  const now = deps.now ? deps.now() : new Date().toISOString();
  const input = hook.buildInput(context);
  const canonical_input = canonicalize(input);
  const input_hash = await hashCanonical(canonical_input, deps);

  const prompt_file = await loadPrompt(hook.name, options.prompt_version, context.repository);
  const rendered = hook.renderPrompt(input, prompt_file);

  let raw_text = "";
  let model_id = provider.id;
  let parsed: TOut | undefined;
  let parse_status: "ok" | "fallback" | "error" = "ok";

  try {
    const response = await provider.complete({
      prompt: rendered,
      output_schema: prompt_file.schema_out,
      model_hint: prompt_file.model_hint,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
    });
    raw_text = response.raw_text;
    model_id = response.model_id;
    const parse_result: ParseResult<TOut> = hook.parseOutput(raw_text, prompt_file.schema_out);
    if (parse_result.kind === "ok") {
      parsed = parse_result.value;
    } else {
      const fallback = hook.fallback(input, parse_result.error);
      ({ parsed, parse_status } = projectFallback(fallback, "fallback"));
    }
  } catch (err) {
    const provider_err =
      err instanceof ProviderError
        ? err
        : new ProviderError(`unknown provider error: ${(err as Error).message}`, provider.id, err);
    const fallback = hook.fallback(input, provider_err);
    ({ parsed, parse_status } = projectFallback(fallback, "error"));
  }

  return {
    hook_id: hook.id,
    prompt_name: prompt_file.hook_name,
    prompt_version: prompt_file.version,
    provider_id: provider.id,
    model_id,
    input_hash,
    raw_response: raw_text,
    parsed: parsed as TOut,
    parse_status,
    generated_at: now,
    echo_input: input,
  };
}

function projectFallback<T>(
  fallback: FallbackResult<T>,
  status_on_value_kind: "fallback" | "error",
): { parsed: T; parse_status: "ok" | "fallback" | "error" } {
  if (fallback.kind === "deterministic_fallback") {
    return { parsed: fallback.value, parse_status: "fallback" };
  }
  return { parsed: undefined as unknown as T, parse_status: status_on_value_kind };
}

export function applyDecision<TOut>(
  hook: HookContract<unknown, TOut>,
  suggestion: SuggestionResult<TOut>,
  decision: ConfirmationDecision<TOut>,
  context: HookContext,
  deps: LlmHooksDeps = {},
): { commit_plan: CommitPlan; invocation_record: HookInvocationRecord } {
  let commit_plan: CommitPlan;
  if (decision.kind === "rejected") {
    commit_plan = { writes: [], versioned: false };
  } else {
    commit_plan = hook.commit(decision.final, context);
  }
  const invocation_record = buildInvocationRecord(
    {
      suggestion: suggestion as SuggestionResult<unknown>,
      decision: decision as ConfirmationDecision<unknown>,
      commit_plan,
      committed: decision.kind !== "rejected",
    },
    deps,
  );
  return { commit_plan, invocation_record };
}
