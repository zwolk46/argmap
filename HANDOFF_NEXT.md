Branch: worktree-audit-fixes-20260516 at /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-fixes-20260516. Not merged to main. The deployed Vercel build matches this branch (last deploy: audit-fixes-20260516.vercel.app, audit-fixes-20260516-60a0ugvum); main itself is still at c380c71.

Audit source of truth: /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-report-20260516/.claude/audit/2026-05-16/ (15 per-area markdown files: 01-boot-auth.md through 16-performance-misc.md).

What's already done (do not re-fix)

Every CRITICAL across §1–§16, and the HIGHs in each section that didn't require schema/data migration, architectural rewrite, or cross-store coupling. Specifically the headlines:

- §4 canvas P0-3, P0-4, P0-6, P0-7, P0-9, P0-11
- §5 panes P0-5, P0-6
- §6 argument-running C3, H4, H9, H14, H16, M16, L2, L8
- §7 mode-change H1, H7, M9, M14
- §8 version-history #4, #6, #7, #8, #9, #10, #11, #12
- §9 chrome HIGH #1–#6, #11, #27, #28, #29 + MEDIUM #7, #17, #19, #24, #32
- §11 persistence H-10, H-11, H-12, H-14, H-16 + new typed RepositoryError.code
- §12 LLM hooks F-03, F-04, F-05 (frame + session halves both done), F-07, F-13, F-16, F-17 — schema_out is now enforced by runHook before commit (src/llm-hooks/schema-validate.ts); SuggestionResult and HookInvocationRecord carry prompt_body_hash + rendered_prompt_hash; the per-frame LlmSettings gate runs in useAiSuggestion for session-store hooks via session_store.rejectSuggestion(reason)
- §13 a11y HIGH #7, #8, #10, #11, #12, #13, #15, #16, #17
- §14 visual design HIGH #6, #7, #11, #27, #33
- §15 schema F-3, F-4, F-5, F-7, F-8, F-9, F-12, F-14, F-15 (new V-ARG-9, V-NODE-10, V-NODE-11, transition advisories)
- §16 perf F-07 (README), F-08 (smoke already correct)

Material still to resolve — ordered by ROI

Architectural / data layer (largest):

1. §11 C-1..C-5 persistence overhaul. No IndexedDb fallback at runtime (src/main.tsx:96-99 only wires SupabaseRepository), failed autosaves never retry (src/persistence/autosave.ts:175-187), pagehide/beforeunload flush is fire-and-forget (src/main.tsx:117-140), composite repo methods (createBlankFrame, migrateSession, restoreFrameVersion in src/persistence/supabase-repository.ts) do 2-N sequential writes with no transaction, and optimistic-UI mutations never rollback on save failure. Audit recommends sendBeacon for unload-time flushes, Postgres RPC for composite atomicity, and a dirty-flag-banner-plus-rollback path in src/state/frame-store.ts + session-store.ts applyPatch handlers.
2. §11 H-13/H-15/H-17/H-19 search + pagination + cross-store broadcast. search_index.tsv is null permanently (Postgres-side generated tsvector column needed). listFrames / listFrameVersions / listSessionVersions have no pagination — users with 1000+ rows lose recent history. deleteFrame doesn't publish frame_deleted; peer tabs stay stale. App-state broadcasts can ping-pong across tabs.
3. §8 #1 ArgumentSessionVersion own frame_version_snapshot. Schema change in src/schema/session.ts:125-140; the session preview currently renders historical premises against the current frame (visual lie). Needs schema field + persistence backfill + repository read path + session-preview-view rewrite. Touches src/ui/version-history/session-preview-view.tsx:58, 71-78, 122-132.
4. §8 #2 destructive frame-restore disclosure. src/ui/version-history/version-history-pane.tsx:86, 137 always passes allow_restore=true from Frame Building. Restoring an older frame version silently strands sessions anchored to later versions. Needs: dialog disclosure listing affected sessions, per-session migration prompts after restore.

LLM determinism / auditability (remaining):

5. §12 F-09 G6 rewrite provenance linkage. The G6 rewrite commits to session output_overrides.rewritten_prose with no HookInvocationRecord pointing back to its prompt/model. useFieldAttribution only walks frame.llm_settings.invocations; the prose-tab "AI rewrite" chip therefore can't show model/prompt-version/generated-at. Needs either a session-level invocations array or a session_id-keyed pointer into frame invocations.
6. §12 F-10 G6 rewrite-then-edit-then-rewrite merge. Re-running G6 after a user edits the rewrite passes canonical (not the edit) as baseline_prose, silently discarding the edit on the second run. Needs explicit baseline choice in the drawer + copy.
7. §12 F-11 ProviderError wrapping of parse-layer asserts. confirmation.ts:60-67 wraps a parseOutput-thrown error (G7/G10/G12 are deterministic-fallback hooks that _throw_ in parseOutput) as "provider error". Auditability hole — separate ParseAssertError from ProviderError before wrapping.
8. §12 F-15..F-22 drawer UX cluster. F-15 (edit textarea corrupts structured outputs) is the highest-impact remaining; F-16 (no Escape close), F-17 (raw JSON.stringify preview), F-18 (no CommitPlan preview on Accept), F-22 (G6 chip not AiAttributionChip) follow. The audit's recommendation is to migrate the drawer to per-hook SuggestionEditPanel components and populate the SUGGESTION_EDIT_PANELS registry, currently dead code.

A11y / UX (mid-size):

9. §13 #4–#6 canvas keyboard nav. Palette drop and edge creation are mouse-only. Needs React Flow nodesFocusable + per-node tabIndex + a custom keyboard handler ("Space picks up palette item, arrow keys position, Enter places"; "E enters edge mode on a selected node, Enter on a target creates the edge"). Largest single a11y debt.
10. §13 #14 / §13 #18 tab order + aria-invalid wiring. Canvas is missing from tab order entirely (consequence of #4-6). Every form input (src/ui/onboarding/sign-in-screen.tsx, new-frame-wizard.tsx, all session-settings inputs) lacks aria-invalid / aria-describedby wiring linking error spans to fields. Cross-cutting but mechanical.
11. §14 #1 mode-accent transition. Mode flip currently snaps colors in one frame. Deferred because it's a broad CSS change with unknown layout side-effects; pick a small set of consumer elements (focus rings, button accents, edge colors) and add a 150ms transition.
12. §9 MEDIUMs not done: #8 frame-title length cap + paste-flattens-newlines (chrome/frame-title.tsx:41-63), #10 sign-out aria-label "user" fallback, #12 validation-indicator splits error vs warning count, #13 validation-indicator hover-state visibility, #14 mode-toggle confirm-dialog copy mismatch, #15 chrome 320px breakpoint, #20 help-glossary legal entries hide when no frame, #21 OnboardingPreferencesSection misplaced inside Help & Glossary, #25 drawer backdrop scrim + click-outside, #30 delete-dialog title truncate, #33 archive toggle progress + toast, #34/#36 G6/G12 copy tightening, #38–#40 metadata draft-vs-external-update conflict + maxLength + character counter.

Schema (smaller):

13. §15 F-6 Premise.kind discriminated union. **DEFERRED** — V-ARG-3 runtime already validates the cross-vocabulary leak, but the static type is a wide union. A real static guard requires either (a) splitting Premise into per-mode-flavor sub-types with consequence at every call site, or (b) carrying mode_flavor on each Premise (denormalization). Both break the Premise contract widely; the call is a schema design decision that warrants user input or its own focused session. Per Article IV § 4 substantial-hesitation standard.
14. §15 F-10 Edge.layer / Node.layer type-pin rules. Per-edge-type and per-node-type layer constraints not enforced at runtime. New V-EDGE-5 and V-NODE-12 rules covering the cross-product. (V-NODE-11 is now taken by F-9.)
15. §15 F-11 cross-Frame position_id consistency. V-FR-10 only checks non-empty; the cross-Frame check is documented as deferred to repository layer but never wired. Add to src/persistence/supabase-repository.ts load paths.
16. §15 F-13 `linked_to` SubQuestion-parent check. **AMBIGUOUS — needs user input before implementing.** The audit header (15-schema-edges.md:121) says "Terms share the same SubQuestion parent," but the audit body describes the contract as "shared interpretations across SubQuestions" — the literal text says `linked_to` is meant to connect Terms ACROSS different SubQuestions, which the same-parent rule would forbid. Two defensible rules: (a) enforce same-SubQuestion parent (header reading; restrictive); (b) enforce that linked Terms have matching `INTERPRETED_AS` child sets (body reading; preserves the cross-SubQuestion feature). Pick before writing the new V-NODE rule. Per Article IV § 4 substantial-hesitation standard.

Polish / dead-code:

17. §16 F-13 audit-code rationale comments. // P0-N, // P1-N, // F-NNN markers leak into ~25 source files. Mechanical sweep. Don't touch unless you're already touching that file for a real fix — orphan diffs aren't worth the review burden.
18. §16 F-26 error-boundary remote reporting. src/ui/error-boundary.tsx:24 logs to console only. Add Sentry / equivalent (out of scope for non-architectural pass).
19. §16 F-28 vercel.json security headers. Missing CSP, X-Frame-Options, X-Content-Type-Options. Project root.

Working notes for the next agent

- The codebase is on worktree-audit-fixes-20260516, NOT main. Main is unchanged at c380c71 (last commit: F-028 snapshot). Before continuing, either git checkout worktree-audit-fixes-20260516 from main repo, or work directly in /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-fixes-20260516. The user has not asked for a merge to main yet; do not push or merge without explicit consent.
- Run npm test && npm run typecheck && npm run lint && npm run format -- --check from the worktree dir before each commit. All four were green at 2c9450d. Test count: 1662.
- CLAUDE.md determinism constraints are still binding: F-028 snapshot fields on FrameVersion, LLM model pinned to claude-3-7-sonnet-20250219 with temperature: 0, no dispose() on useMemo([]) resources (StrictMode), detectSessionInUrl: false in supabase-client.ts.
- Use useOptionalToast (not useToast) in any primitive that may render in test harnesses without <ToastProvider>. Pattern established in chrome/frame-title.tsx and version-history/restore-confirm-dialog.tsx.
- ESLint module boundaries: src/ui/ may only type-import from @/llm-hooks (no value imports). src/state/ may not import @/llm-hooks at all. If you need hook metadata at the UI layer (e.g., activation strings, mode_visibility), either pass it through @/schema or hardcode the minimum needed (see use-ai-suggestion.ts gate which uses both runtime + output-time group flags coarsely rather than activation lookup).
- New helpers introduced this session: src/llm-hooks/schema-validate.ts (JSON-schema subset validator covering type, required, properties, items, enum, minLength/maxLength, minItems/maxItems, minimum/maximum). Future hooks can rely on enforcement at the runHook boundary; per-hook parseOutput no longer needs to re-check the schema shape.
- session_store.rejectSuggestion(reason: string) is the surface for "the per-frame gate denied this hook" — keeps session_store agnostic of frame state while still letting the toast bridge render the failure.
- The audit reports themselves live in a separate worktree (worktree-audit-report-20260516) so they survive across branches. Don't edit them.

Deployment is live at https://audit-fixes-20260516.vercel.app (branch-aliased); redeploy after each substantial batch with vercel deploy --prod --yes --scope zachs-projects-74dd78e7 from the worktree dir.
