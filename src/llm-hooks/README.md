# `src/llm-hooks/`

**Status:** placeholder. Spec: `docs/stream_i_llm_hooks_spec_v1.html`. Coding
session I.8 implements `HookContract`, `LlmProvider`, the prompt loader,
`MockLlmProvider`, the Anthropic provider, and per-hook implementations.

The runtime module **never** imports this module (Article II § 2). LLM-driven
projections that affect compute reach the runtime through FrameVersion /
ArgumentSessionVersion fields baked at build time (see F-001, F-002).
