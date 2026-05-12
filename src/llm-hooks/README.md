# `src/llm-hooks` — Module I.8

LLM integration layer for the argument mapping application. Provides the 13 hook contracts (G1–G13), prompt loading, template rendering, provenance hashing, and the confirmation/decision pipeline. Subordinate to the determinism boundary: `src/runtime` must not import this module.

---

## Public API (re-exported from `@/llm-hooks`)

| Export                                                  | Description                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `runHook(hook, ctx, provider, opts, deps?)`             | Orchestrates buildInput → loadPrompt → renderPrompt → complete → parseOutput/fallback. Returns `SuggestionResult<TOut>`. |
| `applyDecision(hook, suggestion, decision, ctx, deps?)` | Converts a user decision into a `CommitPlan` + `HookInvocationRecord`.                                                   |
| `parseFrontmatter(raw)`                                 | Parses `---` YAML frontmatter from a prompt markdown file. Throws `FrontmatterParseError`.                               |
| `renderTemplate(body, vars)`                            | Mustache rendering with HTML escaping disabled (safe for LLM prompts).                                                   |
| `canonicalize(input)`                                   | Deterministic JSON serialization with sorted object keys. Non-finite numbers throw.                                      |
| `hashCanonical(canonical, deps?)`                       | SHA-256 of a canonicalized string → 64-char hex.                                                                         |
| `buildInvocationRecord(args, deps?)`                    | Constructs a `HookInvocationRecord` from a suggestion + decision.                                                        |
| `MockLlmProvider`                                       | Deterministic test provider; keys responses by SHA-256(`{model_hint, prompt}`).                                          |
| `AnthropicProvider`                                     | Production provider wrapping `@anthropic-ai/sdk`.                                                                        |
| `HOOK_REGISTRY`                                         | Sorted `ReadonlyMap<HookId, HookContract>`.                                                                              |
| `getHook(id)`                                           | Look up a hook by id; throws if unknown.                                                                                 |
| `listHooks()`                                           | All hooks in sorted id order.                                                                                            |
| `listHooksForMode(mode, flavor?)`                       | Hooks visible in the given mode/flavor.                                                                                  |

---

## Hook Inventory

| Id  | Name                               | Activation      | Trigger                | v1 path                |
| --- | ---------------------------------- | --------------- | ---------------------- | ---------------------- |
| G1  | checkpoint_question_generation     | build_time      | manual                 | LLM                    |
| G2  | interpretation_suggestion          | build_time      | manual                 | LLM                    |
| G3  | conclusion_reasoning_summary       | build_time      | manual_with_auto_offer | LLM                    |
| G4  | gap_detection                      | build_time      | automatic              | LLM                    |
| G5  | burden_threshold_calibration       | build_time      | manual_with_auto_offer | LLM (legal only)       |
| G6  | prose_rewrite                      | output_time     | manual                 | LLM                    |
| G7  | premise_reuse_ranking              | build_time      | automatic              | deterministic fallback |
| G8  | conclusion_direction_suggestion    | build_time      | manual                 | LLM                    |
| G9  | position_table_suggestion          | build_time      | manual                 | LLM (general only)     |
| G10 | frame_template_ranking             | build_time      | automatic              | deterministic fallback |
| G11 | premise_drafting_from_fact_pattern | runtime_sidecar | manual                 | LLM                    |
| G12 | cross_implications                 | runtime_sidecar | automatic              | deterministic fallback |
| G13 | version_change_summary             | build_time      | automatic              | LLM                    |

---

## Key types

```ts
interface HookContract<TIn, TOut> {
  id: HookId;
  name: string;
  activation: "build_time" | "runtime_sidecar" | "output_time";
  trigger: "manual" | "automatic" | "manual_with_auto_offer";
  mode_visibility: { legal: boolean; general: { personal: boolean; academic: boolean } };
  buildInput(ctx: HookContext): TIn;
  renderPrompt(input: TIn, prompt: PromptFile): string;
  parseOutput(raw: string, schema: unknown): ParseResult<TOut>;
  fallback(input: TIn, error: ParseError | ProviderError): FallbackResult<TOut>;
  commit(output: TOut, ctx: HookContext): CommitPlan;
}

interface HookContext {
  repository: Repository;
  frame?: Frame; // provides mode/flavor/jurisdiction for buildInput bodies
  frame_version: FrameVersion;
  session?: ArgumentSession;
  selection?: NodeRef | EdgeRef;
  user_input?: unknown;
}
```

---

## Determinism boundary

`src/runtime` must never import `@/llm-hooks`. The sorted-iteration eslint rule
(`argmap-determinism/no-unsorted-iteration`) is enforced on all files under `src/llm-hooks/`.

---

## Implementation decisions

- `HookContext.frame` is optional (additive, non-breaking). All `buildInput` bodies default to
  `ctx.frame?.mode ?? "general"` etc.
- `PromptFileRecord` (persistence shape, has `frontmatter` + `body_markdown`) is distinct from
  `PromptFile` (hook shape, has flat fields + `body`). The conversion is in
  `prompt-loader.ts::recordToPromptFile`.
- `parseFrontmatter` normalizes the entire input (including body) from CRLF to LF.
- G7, G10, G12 ship with deterministic fallbacks only; `parseOutput` throws if called.
- Prompt files live under `src/llm-hooks/prompts/<hook_name>/v1.md` with YAML frontmatter.
