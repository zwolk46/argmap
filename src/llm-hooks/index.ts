// Contract surface
export * from "./contracts";

// Suggestion lifecycle types (used by @/ui type-only)
export type { SuggestionResult, ConfirmationDecision } from "./types";

// Registry
export { HOOK_REGISTRY, getHook, listHooks, listHooksForMode } from "./registry";

// Orchestrator
export { runHook, applyDecision, type RunHookOptions } from "./confirmation";

// Provenance
export {
  canonicalize,
  hashCanonical,
  buildInvocationRecord,
  type ProvenanceDeps,
} from "./provenance";

// Provider factory
export {
  createProvider,
  PROVIDER_CAPABILITIES,
  AnthropicProvider,
  DEFAULT_ANTHROPIC_MODEL,
  MockLlmProvider,
  UnexpectedPromptError,
  type ProviderConfig,
} from "./providers";

// Prompt loader
export { loadPrompt, preloadBundledPrompts, PromptNotFoundError } from "./prompt-loader";
export { parseFrontmatter, FrontmatterParseError } from "./prompt-frontmatter";
export { renderTemplate } from "./prompt-template";
