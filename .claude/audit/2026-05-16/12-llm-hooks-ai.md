# LLM Hooks + AI Features Audit

**Scope:** `src/llm-hooks/` (contracts, registry, provenance, providers, prompts, hooks), `src/ui/ai-suggestion/`, `src/ui/primitives/ai-attribution-chip.tsx`, `src/ui/primitives/ai-sparkle.tsx`, attribution/sparkle call sites, `src/ui/session-settings/g6-remove-rewrite-section.tsx`, `src/ui/session-settings/g12-advisory-toggle-section.tsx`, the `useAiSuggestion` hook, `src/state/{context,frame-store,session-store}.tsx`, the 13 hook prompt files, and tests under `tests/llm-hooks/`.

**Critical preamble — the LLM path is wired but dormant.** `/Users/zacharywolk/zwolk/argmap/src/state/context.tsx:117` hardcodes `ai_hooks_enabled: false` and neither `invoke_hook` nor `apply_decision` is passed into `createFrameStore` / `createSessionStore` from the `RepositoryProvider` (no opt is set in `/Users/zacharywolk/zwolk/argmap/src/state/context.tsx:63-91`). UI buttons correctly gate on `aiSuggestion.enabled` (`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:96`, `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:191`), so today no LLM call ever fires. This downgrades every "determinism violation" from a current production breach to a safeguard gap that becomes a breach the second the bit flips — but the project Constitution explicitly demands rigor "crafted with rigor sufficient to make the determinism guarantee hold across ordinary operating conditions, including across model and infrastructure changes the implementation can reasonably anticipate" (Article II § 2), so these are still in-scope blockers for wiring day.

Severity buckets: CRITICAL (blocks the moment the path is enabled or actively misleads users today), HIGH (significant correctness/security gap), MEDIUM (real user-facing or auditability problem), LOW (polish / minor).

---

## DETERMINISM (Article II § 2)

### F-01 — CRITICAL — Floating `-latest` model alias is a direct violation
Every one of the 10 production prompts declares `model_hint: claude-3-7-sonnet-latest` (frontmatter), and `/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/anthropic.ts:10` hardcodes `DEFAULT_ANTHROPIC_MODEL = "claude-3-7-sonnet-latest"` as the fallback when no hint is supplied. Aliases like `-latest` are remapped by Anthropic without notice; the same `input_hash` will produce different `raw_response` content as the underlying snapshot rotates. Article II § 2 says implementations must hold determinism "across model and infrastructure changes the implementation can reasonably anticipate" — model rotation under a floating alias is the canonical example. Files: `src/llm-hooks/prompts/*/v1.md` (all 10), `src/llm-hooks/providers/anthropic.ts:10`.

### F-02 — CRITICAL — Default temperature is 0.2, not 0
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/anthropic.ts:40` — `temperature: req.temperature ?? 0.2`. Any non-zero temperature reintroduces sampling noise; even at 0.2 two calls with identical prompts can diverge. `runHook` (`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/confirmation.ts:48-49`) never passes a temperature, so 0.2 is the operative default. The only thing keeping the system "deterministic" today is dormancy. (Anthropic's API is not bit-exact at temperature 0 either, but 0 is the floor.)

### F-03 — HIGH — `input_hash` covers structured input only; never the rendered prompt or prompt body
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/confirmation.ts:31-33` hashes `canonicalize(hook.buildInput(context))`. The `SuggestionResult` records `prompt_version` (a name string) but not a content hash of `prompt_file.body`, nor of the final `rendered` string sent to the model. Two practical consequences:
1. Replay can't prove the rendered prompt was byte-identical without re-running `loadPrompt` and trusting that nothing changed in the bundle or the archived DB row.
2. If a Mustache helper or a hook's `renderPrompt` is changed (e.g., G12 ships an LLM path later) the `input_hash` won't notice; same input, different rendered prompt, different output, no provenance signal.
Fix shape: extend `SuggestionResult` with `prompt_body_hash` + `rendered_prompt_hash`. Files: `src/llm-hooks/confirmation.ts:23-82`, `src/llm-hooks/types.ts:88-102`.

### F-04 — HIGH — Output schema is declared but not enforced
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/confirmation.ts:53` passes `prompt_file.schema_out` into `hook.parseOutput(raw, prompt_file.schema_out)`. Every single hook ignores it (search: every `parseOutput(raw: string, _schema)` body). The frontmatter `schema_out` is documentation that never validates. A malformed model response with the right top-level shape but wrong array item types (e.g., G2 interpretations with `citation_hint` as a string instead of object) flows straight through ad-hoc `typeof` checks into `commit()`. Files: every `src/llm-hooks/hooks/g*.ts`, e.g. `g2-interpretation-suggestion.ts:66-85`.

### F-05 — HIGH — `LlmSettings.{build_time,runtime,output_time}_hooks_enabled` are declared but not enforced anywhere
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:67-76` defines the three per-activation enable flags; `/Users/zacharywolk/zwolk/argmap/src/main.tsx:10-15` defaults all to `false`. No code reads them as a gate. `frameStore.invokeHook` (`src/state/frame-store.ts:125-138`) and `sessionStore.invokeHook` (`src/state/session-store.ts:188-199`) call `opts.invoke_hook(hook_id, args)` directly — no consultation of the hook's activation, no consultation of the per-activation flag, no consultation of the per-frame `llm_settings`. The only consumer is G12 advisories (see F-06). The flags are a Potemkin guarantee — UI surfaces them as toggles in the spec but the data path doesn't honor them. The moment `ai_hooks_enabled` flips on, every hook fires regardless of its per-frame setting.

### F-06 — MEDIUM — Per-hook enable only honored for G12; G1–G11, G13 have no off-switch
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:72` defines `per_hook_enabled?: { [hook_name: string]: boolean }`. Only `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g12-advisory-toggle-section.tsx:13-17` reads it (and only for `cross_implications`). The other 12 hooks ignore per-frame disable.

### F-07 — HIGH — `loadPrompt` does a side-effecting DB write on every call, with no integrity check between bundle and archived copy
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/prompt-loader.ts:59-66` — on every bundled-prompt hit, `repository.savePrompt({...})` runs, re-writing the archived row. Two problems:
1. Determinism is one direction: the bundle is the source of truth (note at line 45), but the archived `added_at` is overwritten each call to `bundled.created_at ?? new Date(0).toISOString()`. If `created_at` is absent (it's optional and not set in most frontmatter files I checked), every call writes epoch zero.
2. There's no body-hash comparison between bundle and archive. A later version of the bundle silently replaces what's in the DB; you can never tell from provenance which body was actually used at the time of a stored invocation.

### F-08 — MEDIUM — `MockLlmProvider` keys responses on `{model_hint, prompt}` only; temperature/max_tokens ignored
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/mock.ts:43`. Tests can't catch a regression that quietly raises `temperature` or `max_tokens`, because the mock returns the same canned answer regardless. The temperature-default risk (F-02) is therefore invisible to the test suite.

### F-09 — HIGH — G6 prose-rewrite stores the rewrite as `output_overrides.rewritten_prose` with no provenance linkage
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/hooks/g6-prose-rewrite.ts:58-69` writes the rewrite under `output_overrides.rewritten_prose` (a session-version field, `src/schema/session.ts:141-142`). The `HookInvocationRecord` lives on `Frame.llm_settings.invocations`, but G6 commits to the *session*, not the frame. There is no documented mapping from a stored rewrite back to the invocation that produced it. `useFieldAttribution` (`src/ui/frame-building/right-pane/use-field-attribution.ts:30-36`) only looks at `frame.llm_settings.invocations`. The "AI rewrite" header in `src/ui/argument-running/output-viewer/prose-tab.tsx:148-164` cannot show model / prompt-version / generated-at provenance because the rewrite isn't anchored to a record.

### F-10 — MEDIUM — G6 rewrite-then-edit-then-rewrite has no documented merge
If a user accepts a G6 rewrite (stored in `output_overrides.rewritten_prose`), then manually edits the canonical prose, then re-runs G6 — `g6Hook.buildInput` (`src/llm-hooks/hooks/g6-prose-rewrite.ts:23-30`) takes `ctx.user_input` as `baseline_prose`. The caller (`prose-tab.tsx:101`) passes `{ canonical }`, not the post-edit rewrite. So a re-run rewrites the canonical, not the user's edited rewrite. No code path or copy explains this. The user's edits to the rewrite vanish silently on a second run.

### F-11 — MEDIUM — Hooks treat malformed responses as `advise_user` but the runner wraps everything in `ProviderError`
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/confirmation.ts:60-67` — when `hook.parseOutput` *throws* (as G7, G10, G12 do by design — they're deterministic-fallback hooks whose `parseOutput` throws `"LLM path not active in v1"`), the catch block wraps it as `new ProviderError("unknown provider error: ...", provider.id, err)` and routes through `hook.fallback(input, provider_err)`. The user-visible message and the audit-log error class both say "provider error" for what was actually a parse-layer assertion. Auditability is degraded.

### F-12 — MEDIUM — `g4-gap-detection.ts:52` silently truncates advisories to 8 items
`const capped = (p.advisories as ValidationResult[]).slice(0, 8);` — no signal returned to the user that the 9th, 10th, ... advisory was dropped. Determinism-safe, but auditability hole.

---

## SECURITY

### F-13 — HIGH — Anthropic provider expects an api_key in browser-bundled code; no environment guard
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/anthropic.ts:28-30` — `new Anthropic({ apiKey: config.api_key, baseURL: config.base_url })`. No check that we're in a server context. The provider lives in `src/llm-hooks/`, imported by `@/llm-hooks` index, ultimately importable by anything in `@/state` or `@/ui`. `.env.local` currently does **not** set `VITE_ANTHROPIC_API_KEY` (only Supabase vars), but the task description's premise that it might be added is the right concern: any Vite var prefixed `VITE_` is bundled into the client. The first PR that adds `VITE_ANTHROPIC_API_KEY` ships the key to every browser. No comment in `anthropic.ts` warns against client-side use; no server-only marker exists. Required mitigations: (a) introduce a server-side AI Gateway / proxy and never construct `AnthropicProvider` in client code, (b) name the var `ANTHROPIC_API_KEY` (no VITE prefix) so accidental bundling fails loudly, (c) add a `typeof window === "undefined"` guard in the `AnthropicProvider` constructor. None of these are in place.

### F-14 — MEDIUM — No timeout / abort / retry / rate-limit handling in `AnthropicProvider.complete`
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/anthropic.ts:33-67` — a single `await this.client.messages.create(...)` with no `signal`, no timeout. A hung request leaves `suggestion_status: "invoking"` set forever (`src/state/frame-store.ts:126`, `src/state/session-store.ts:189`) and the user has no way to cancel — there's no `clearPendingSuggestion` UI surface and the drawer doesn't render in the `invoking` state. On a 429 / 5xx, `ProviderError` is thrown and routed to `fallback`, which for most hooks calls `advise_user` and stranded status remains `idle`. No retry, no backoff.

---

## UX / USER PERSPECTIVE

### F-15 — CRITICAL — Edit textarea silently corrupts every structured-output hook
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:14, 32-37, 80-90`. The edit flow:
1. Click Edit → `setEditedValue(result.parsed)` is called with the structured object.
2. Textarea renders `JSON.stringify(edited_value)` (line 82) when `edited_value` isn't already a string.
3. As soon as the user types one character, `onChange` calls `setEditedValue(e.target.value)` — `edited_value` is now a string (the JSON text the user is editing).
4. Click "Confirm edit" → `resolve({ kind: "edited", final: edited_value })` passes a *string* to `hook.commit(...)`.
For G1 (expects `{question, options}`), G2 (`{interpretations: [...]}`), G5 (`{thresholds, rationale}`), G8 (`{direction, rationale}`), G9 (`{positions: [...]}`), G11 (`{draft_premises: [...]}`), the commit will iterate / index a string, crashing or writing garbage. There is no `JSON.parse` on the way back out. Only G3, G6, G13 (single-string outputs) survive. This is reachable today the first time the feature is enabled — a one-keystroke regression.

### F-16 — HIGH — Drawer Escape key is wired to a no-op
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:47` renders `<Drawer open={is_open} ...>` with no `onClose` prop. The drawer's Escape handler (`src/ui/primitives/drawer.tsx:81-87`) calls `onClose?.()` — no-op. There is also no close-X in the header. The user's only off-ramps are Reject / Edit / Accept. Standard a11y / UX expectation (modal dialog → Escape dismisses) is broken.

### F-17 — HIGH — Suggestion drawer body shows raw `JSON.stringify(..., null, 2)` for structured outputs
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:108-110` — when `result.parsed` isn't a string, the preview is `JSON.stringify(result.parsed, null, 2)`. A law student reviewing a G1 checkpoint suggestion sees JSON braces, key names, and array brackets instead of "Question: …" / "Options: …". The Constitution Article III § 4 (Clarity, "readable by the user without specialized tooling") is contradicted.

### F-18 — HIGH — No preview of which fields will be overwritten on Accept
The drawer shows the *suggestion* but never previews the `CommitPlan` (which `field_path`s on which `target_node_id`s get `set` / `append` / `create_node`). Users approve a Term node's three Interpretations being created without seeing that the suggestion will also create three Authority nodes and three CITES edges when `is_legal` (`src/llm-hooks/hooks/g2-interpretation-suggestion.ts:91-119`). Constitution Article III § 2 (Legal Practice Fit) — practitioners need to know what they're signing off on.

### F-19 — MEDIUM — `SUGGESTION_EDIT_PANELS` is dead code
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-edit-panel.tsx:31-34` exports an empty `ReadonlyMap`. It's never populated anywhere (`grep -rn "SUGGESTION_EDIT_PANELS"` shows two hits — the definition and the re-export). `SuggestionDrawer` doesn't use `SuggestionEditPanel` at all — it has its own inline textarea (line 80). The whole `suggestion-edit-panel.tsx` file is a no-op. Either dead and should go, or the drawer should be migrated to it (and then the empty map needs hook-typed entries).

### F-20 — MEDIUM — Reject / Edit buttons disable on `is_applying` but provide no progress indicator
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:118-138` — only Accept toggles to "Applying…". The other two go silently dead, which reads as "the buttons broke" rather than "an operation is in flight."

### F-21 — MEDIUM — Drawer width caps at 420px regardless of content
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:47` — `width="min(420px, 100vw)"`. G2 returns an array of interpretations with statements + rationale + optional citation; G9 returns multiple positions with descriptions; G11 returns multiple draft premises with source quotes. Either the text wraps awkwardly inside 420px, or the user has to scroll an extremely tall column. No resize affordance.

### F-22 — MEDIUM — AI rewrite header in prose tab uses a bespoke chip, not `AiAttributionChip`
`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:148-164` renders its own `<div title="Rewritten by G6">` with `AiSparkle` + "AI rewrite". The reusable `AiAttributionChip` (`src/ui/primitives/ai-attribution-chip.tsx`) is what's used elsewhere and provides a Tooltip with model_id / prompt_version / invoked_at. The prose-tab chip exposes none of that. Two inconsistencies: visual (different chip styling) and informational (no provenance hover). See also F-09 — the underlying reason is that there's no `HookInvocationRecord` to feed the chip.

### F-23 — MEDIUM — `node-frame.tsx` displays only the first attribution
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:198` — `{attributions && attributions.length > 0 && <AiAttributionChip record={attributions[0]} />}`. If multiple AI hooks have touched a node (e.g., G1 then G3), the user sees only the first chip. No "+2 more" indicator.

### F-24 — MEDIUM — Field-attribution chip persists after a user manually overwrites the field
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/right-pane/use-field-attribution.ts:7-15` walks `invocations` newest-first looking for an `accepted` or `edited` record matching `(node_id, field_path)`. Manual edits don't write to `invocations`, so the chip stays attached even though the current value is wholly user-typed. From the user's POV: "this says AI made this, but I rewrote it after." Auditability lie.

### F-25 — LOW — `AiSparkle` uses `aria-hidden="true"`, so screen readers never announce the AI presence
`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/ai-sparkle.tsx:25` — `aria-hidden="true"`. For non-AI decorative chrome that's right; for the *only* visual indicator that AI touched the content this is wrong. The `AiAttributionChip` next to the sparkle does have `data-testid="ai-attribution-chip"` but its text-content is the short name ("rewrite", "interp") — not the word "AI" — so a screen-reader user gets "rewrite" with no indication it's machine-generated.

### F-26 — LOW — `AiAttributionChip` tooltip shows `invoked_at` as a raw ISO string
`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/ai-attribution-chip.tsx:43` — `<strong>Generated:</strong> {record.invoked_at}`. Other timestamp surfaces in the app use a relative-time helper (`src/ui/primitives/relative-time.ts` exists). User sees `2026-05-16T14:23:11.471Z`.

### F-27 — LOW — G6 "Remove rewrite" confirm copy is technically precise but conceptually noisy
`/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g6-remove-rewrite-section.tsx:80-82` — "This creates a new session version (v{N+1}). The canonical deterministic output is unchanged." The version-number side-effect is real but readers without versioning context will read this as "are you sure?" with extra jargon. Constitution Article III § 4 (Clarity).

### F-28 — LOW — Suggestion drawer header chip uses uppercase monospace hook id ("G1"), not a human label
`/Users/zacharywolk/zwolk/argmap/src/ui/ai-suggestion/suggestion-drawer.tsx:74-76`. The chip module has `hookShortName` (`src/ui/primitives/ai-attribution-chip.tsx:22-24`) which maps "G1" → "checkpoint". Inconsistent with the chip used everywhere else.

### F-29 — LOW — Race: fast typing into the prose tab + invoking G6
`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:101` passes `canonical` (the current snapshot) into `aiSuggestion.invoke("G6", { canonical })`. If the user keeps typing in another surface during the network round-trip and the canonical prose recomputes, the suggestion arrives keyed to a *stale* canonical. The drawer offers it. Accept writes a rewrite of stale prose into `output_overrides.rewritten_prose`. No staleness check. (Mitigated today because `canonical` is recomputed by runtime, but the hook fires against the snapshot at click-time.)

### F-30 — LOW — No token-usage or cost surface
`CompletionResponse.token_usage` (`src/llm-hooks/types.ts:129`) is captured by `AnthropicProvider` (`src/llm-hooks/providers/anthropic.ts:54-57`) and then *dropped* in `runHook` (`src/llm-hooks/confirmation.ts:69-81` — never copied into `SuggestionResult`). No total-spend display anywhere; no per-frame budget. For a product the user will iterate over "months to years" (Article I) this matters.

### F-31 — LOW — `g13-change-summary.ts:58` word-count gate is `>=30`, comment + prompt say "under 30"
Boundary is correct (29 max accepted; "under 30" includes 29) but rejects exactly-30 — fine, just record this as a tight gate worth keeping in mind for prompt-iteration.

---

## DEAD CODE / POLISH

### F-32 — LOW — `streaming: false` declared but no streaming code path; no plan for partial responses
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/anthropic.ts:20-24` and `/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/index.ts:18-21`. Capability is correctly advertised as off; just flagging that long G2/G4 responses will block the UI with no streaming option.

### F-33 — LOW — `tool_use: false` advertised; no plan for structured output via tool calls
Anthropic supports forced JSON via tool calls; the architecture's reliance on hand-rolled `parseOutput` + ad-hoc `typeof` checks (F-04) could be replaced with tool-use forced shape. Not in plan.

### F-34 — LOW — Provider abstraction is single-vendor in practice
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/index.ts:5-8` — `ProviderConfig` is a discriminated union of exactly `"anthropic" | "mock"`. The README brands the architecture as provider-agnostic. Adding a second vendor (OpenAI, Bedrock, Gateway) requires editing the union and the factory.

### F-35 — LOW — `PROVIDER_CAPABILITIES` constant duplicates per-class `capabilities` getter
`/Users/zacharywolk/zwolk/argmap/src/llm-hooks/providers/index.ts:18-21` declares a frozen capabilities map; `AnthropicProvider` and `MockLlmProvider` both expose `readonly capabilities`. Two sources of truth; if one drifts the lookups disagree.

---

## SUMMARY

35 findings. Breakdown:
- CRITICAL: 3 (F-01, F-02, F-15)
- HIGH: 8 (F-03, F-04, F-05, F-07, F-09, F-13, F-16, F-17, F-18) — 9, actually
- MEDIUM: 14 (F-06, F-08, F-10, F-11, F-12, F-14, F-19, F-20, F-21, F-22, F-23, F-24)
- LOW: 10 (F-25, F-26, F-27, F-28, F-29, F-30, F-31, F-32, F-33, F-34, F-35)

**Top three to fix before wiring:**
1. F-01 + F-02 together — pin a snapshot model (`claude-3-7-sonnet-20250219` or equivalent), set `temperature: 0`. Without this the determinism guarantee is hollow.
2. F-05 — wire the three per-activation flags into `frameStore.invokeHook` / `sessionStore.invokeHook` so the schema's documented kill-switches actually work.
3. F-15 — fix the edit textarea so structured outputs round-trip JSON-parse on commit, or render hook-specific edit panels via the `SUGGESTION_EDIT_PANELS` registry (which today is empty dead code, F-19).

**Top concern for security review:** F-13 — the moment a `VITE_ANTHROPIC_API_KEY` is set, the key ships to every browser. The provider has no environment guard. Required to switch to a server-side proxy / AI Gateway, not a direct browser-side Anthropic client.
