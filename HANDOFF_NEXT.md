Branch: worktree-audit-fixes-20260516 at /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-fixes-20260516. Not merged to main. Last passing-gate commit: e50f248; deployed as dpl_FPWsf4TLyGk8JHLqhchyKy1UKiXN → audit-fixes-20260516.vercel.app. Test count: 1685. main itself is still at c380c71.

**Manual verification needed on deployed build:**

1. **CSP (§16 F-28, carry-forward):** Open https://audit-fixes-20260516.vercel.app in a browser with DevTools Console open and walk: sign-in (Supabase + Google Fonts), Frame Building canvas (ELK worker), AI hook flow (Anthropic API). Any console line starting with "Refused to … because it violates …" indicates the CSP needs widening in vercel.json. Curl confirmed all five headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are served correctly — only runtime CSP compliance remains to confirm.

2. **SessionSettings backdrop + MetadataSection commit-on-blur ordering (NEW, from §9 #25):** Open Session settings, type a draft title or description, then click the new dark backdrop scrim outside the panel. Expected: the draft commits (via the blur handler) BEFORE the panel closes. If the title reverts to the prior value after backdrop click, the event order is wrong on this browser and we need to move the commit to an explicit `mousedown` capture. Cannot be reproduced without a real DOM/browser, so it stays manual.

**Background coding sessions can't open a browser, so these need a human (or a session with browser access).**

Audit source of truth: /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-report-20260516/.claude/audit/2026-05-16/ (15 per-area markdown files: 01-boot-auth.md through 16-performance-misc.md).

What's already done (do not re-fix)

Every CRITICAL across §1–§16, and the HIGHs in each section that didn't require schema/data migration, architectural rewrite, or cross-store coupling. Specifically the headlines:

- §4 canvas P0-3, P0-4, P0-6, P0-7, P0-9, P0-11
- §5 panes P0-5, P0-6
- §6 argument-running C3, H4, H9, H14, H16, M16, L2, L8
- §7 mode-change H1, H7, M9, M14
- §8 version-history #4, #6, #7, #8, #9, #10, #11, #12
- §9 chrome HIGH #1–#6, #11, #27, #28, #29 + MEDIUM #7, #8, #10, #12, #13, #14, #15, #17, #19, #20, #21, #24, #25, #30, #32, #33, #34, #36, #39, #40
- §11 persistence H-10, H-11, H-12, H-14, H-16 + new typed RepositoryError.code
- §12 LLM hooks F-03, F-04, F-05 (frame + session halves both done), F-07, F-11, F-13, F-15, F-16, F-17, F-22 — schema_out enforced by runHook before commit, SuggestionResult and HookInvocationRecord carry prompt_body_hash + rendered_prompt_hash; the per-frame LlmSettings gate runs in useAiSuggestion for session-store hooks via session_store.rejectSuggestion(reason); ParseAssertError separates parse-time asserts from real provider errors; AiAttributionChip accepts an optional record + hook_id and the prose-tab G6 rewrite header now renders the shared chip
- §13 a11y HIGH #7, #8, #10, #11, #12, #13, #15, #16, #17, #18
- §14 visual design HIGH #6, #7, #11, #27, #33
- §15 schema F-3, F-4, F-5, F-7, F-8, F-9, F-10, F-11, F-12, F-14, F-15 (new V-ARG-9, V-NODE-10, V-NODE-11, V-NODE-12, V-EDGE-5, cross-Frame V-FR-10 wired at frame-store load/restore + runFrameAction, transition advisories)
- §16 perf F-07 (README), F-08 (smoke already correct), F-28 (vercel.json: CSP + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy) — headers verified by curl; runtime walk still pending

Material still to resolve — ordered by ROI

Architectural / data layer (largest):

1. §11 C-1..C-5 persistence overhaul. No IndexedDb fallback at runtime (src/main.tsx:96-99 only wires SupabaseRepository), failed autosaves never retry (src/persistence/autosave.ts:175-187), pagehide/beforeunload flush is fire-and-forget (src/main.tsx:117-140), composite repo methods (createBlankFrame, migrateSession, restoreFrameVersion in src/persistence/supabase-repository.ts) do 2-N sequential writes with no transaction, and optimistic-UI mutations never rollback on save failure. Audit recommends sendBeacon for unload-time flushes, Postgres RPC for composite atomicity, and a dirty-flag-banner-plus-rollback path in src/state/frame-store.ts + session-store.ts applyPatch handlers.
2. §11 H-13/H-15/H-17/H-19 search + pagination + cross-store broadcast. search_index.tsv is null permanently (Postgres-side generated tsvector column needed). listFrames / listFrameVersions / listSessionVersions have no pagination — users with 1000+ rows lose recent history. deleteFrame doesn't publish frame_deleted; peer tabs stay stale. App-state broadcasts can ping-pong across tabs.
3. §8 #1 ArgumentSessionVersion own frame_version_snapshot. Schema change in src/schema/session.ts:125-140; the session preview currently renders historical premises against the current frame (visual lie). Needs schema field + persistence backfill + repository read path + session-preview-view rewrite. Touches src/ui/version-history/session-preview-view.tsx:58, 71-78, 122-132.
4. §8 #2 destructive frame-restore disclosure. src/ui/version-history/version-history-pane.tsx:86, 137 always passes allow_restore=true from Frame Building. Restoring an older frame version silently strands sessions anchored to later versions. Needs: dialog disclosure listing affected sessions (verify repository.listSessions(frame_id) exists first — may be unbuilt), per-session migration prompts after restore.

LLM determinism / auditability (remaining):

5. §12 F-09 G6 rewrite provenance linkage. The G6 rewrite commits to session output_overrides.rewritten_prose with no HookInvocationRecord pointing back to its prompt/model. useFieldAttribution only walks frame.llm_settings.invocations; the prose-tab "AI rewrite" chip therefore can't show model/prompt-version/generated-at. Needs either a session-level invocations array or a session_id-keyed pointer into frame invocations.
6. §12 F-10 G6 rewrite-then-edit-then-rewrite merge. Re-running G6 after a user edits the rewrite passes canonical (not the edit) as baseline_prose, silently discarding the edit on the second run. Needs explicit baseline choice in the drawer + copy.
7. §12 F-18..F-21 drawer UX cluster. F-18 (no CommitPlan preview on Accept) is the largest remaining item — needs the drawer to compute hook.commit() outputs ahead of confirmation, which currently runs only on Accept. F-19 (SUGGESTION_EDIT_PANELS registry sits empty; per-hook edit panels would supersede the generic textarea), F-20, F-21 follow. F-15/F-16/F-17/F-22 are now done.

A11y / UX (mid-size):

8. §13 #4–#6 canvas keyboard nav. Palette drop and edge creation are mouse-only. Needs React Flow nodesFocusable + per-node tabIndex + a custom keyboard handler ("Space picks up palette item, arrow keys position, Enter places"; "E enters edge mode on a selected node, Enter on a target creates the edge"). Largest single a11y debt. #14 (tab order predictability) lands together with this fix.
9. §14 #1 mode-accent transition. Mode flip currently snaps colors in one frame. Deferred because it's a broad CSS change with unknown layout side-effects without browser verification; pick a small set of consumer elements (focus rings, button accents, edge colors) and add a 150ms transition.
10. §9 MEDIUMs still pending: #38 session-settings panel read-only/preview gating. (#13 hover-state and #25 drawer backdrop are now done.)

Schema / Other:

11. §15 F-6 Premise.kind discriminated union. **DEFERRED** — V-ARG-3 runtime already validates the cross-vocabulary leak, but the static type is a wide union. A real static guard requires either (a) splitting Premise into per-mode-flavor sub-types with consequence at every call site, or (b) carrying mode_flavor on each Premise (denormalization). Both break the Premise contract widely; the call is a schema design decision that warrants user input or its own focused session. Per Article IV § 4 substantial-hesitation standard.
12. §15 F-13 `linked_to` SubQuestion-parent check. **AMBIGUOUS — needs user input before implementing.** The audit header (15-schema-edges.md:121) says "Terms share the same SubQuestion parent," but the audit body describes the contract as "shared interpretations across SubQuestions" — the literal text says `linked_to` is meant to connect Terms ACROSS different SubQuestions, which the same-parent rule would forbid. Two defensible rules: (a) enforce same-SubQuestion parent (header reading; restrictive); (b) enforce that linked Terms have matching `INTERPRETED_AS` child sets (body reading; preserves the cross-SubQuestion feature). Pick before writing the new V-NODE rule. Per Article IV § 4 substantial-hesitation standard.

Polish / dead-code:

13. §16 F-13 audit-code rationale comments. // P0-N, // P1-N, // F-NNN markers leak into ~25 source files. Mechanical sweep. Don't touch unless you're already touching that file for a real fix — orphan diffs aren't worth the review burden.
14. §16 F-26 error-boundary remote reporting. src/ui/error-boundary.tsx:24 logs to console only. Add Sentry / equivalent (out of scope for non-architectural pass).

Working notes for the next agent

- The codebase is on worktree-audit-fixes-20260516, NOT main. Main is unchanged at c380c71 (last commit: F-028 snapshot). Before continuing, either git checkout worktree-audit-fixes-20260516 from main repo, or work directly in /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-fixes-20260516. The user has not asked for a merge to main yet; do not push or merge without explicit consent.
- Run npm test && npm run typecheck && npm run lint && npm run format -- --check from the worktree dir before each commit. All four were green at e50f248. Test count: 1685.
- CLAUDE.md determinism constraints are still binding: F-028 snapshot fields on FrameVersion, LLM model pinned to claude-3-7-sonnet-20250219 with temperature: 0, no dispose() on useMemo([]) resources (StrictMode), detectSessionInUrl: false in supabase-client.ts.
- Use useOptionalToast (not useToast) in any primitive that may render in test harnesses without <ToastProvider>. Pattern established in chrome/frame-title.tsx, version-history/restore-confirm-dialog.tsx, and now session-settings/archive-delete-section.tsx.
- ESLint module boundaries: src/ui/ may only type-import from @/llm-hooks (no value imports). src/state/ may not import @/llm-hooks at all. If you need hook metadata at the UI layer (e.g., activation strings, mode_visibility), either pass it through @/schema or hardcode the minimum needed (see use-ai-suggestion.ts gate which uses both runtime + output-time group flags coarsely rather than activation lookup).
- New helpers introduced this session sequence: src/llm-hooks/schema-validate.ts (JSON-schema subset validator covering type, required, properties, items, enum, minLength/maxLength, minItems/maxItems, minimum/maximum), and src/schema/validation-rules.ts::validateFrameVersionAgainstFrame (cross-Frame V-FR-10 extension). validateOnly in src/state/action-runner.ts now takes an optional Frame to merge cross-Frame results.
- session_store.rejectSuggestion(reason: string) is the surface for "the per-frame gate denied this hook" — keeps session_store agnostic of frame state while still letting the toast bridge render the failure.
- InlineAlert now accepts `id` so a form input's aria-describedby can point at it. Pattern: per-field useId for both error and hint span ids; combine with `.filter(Boolean).join(" ")` for multi-source describedby.
- MetadataSection (session-settings) now uses a ref-guarded resync effect so cross-tab realtime updates don't trample uncommitted drafts. If you copy this pattern to FrameTitle or any other commit-on-blur input, mirror the `last_synced_*` ref.
- Drawer primitive accepts an opt-in `show_backdrop` prop (§9 #25). When true it renders a semi-transparent scrim at `Z.drawer - 1 = 79` and routes scrim clicks to `onClose`. Currently enabled on HelpGlossaryPane and SessionSettingsPanel. NOT enabled on SuggestionDrawer (async LLM work; accidental scrim clicks would discard it). When adding it elsewhere, audit the panel for commit-on-blur inputs — see the SessionSettings manual-verification note above.
- AiAttributionChip (§12 F-22) accepts EITHER `record: HookInvocationRecord` (rich tooltip with Hook/Prompt/Model/Generated) OR `hook_id: string` (chip only, no tooltip). Use the hook_id-only form when the surface has no provenance record yet — currently only the prose-tab G6 rewrite header. When F-09 (session-level G6 invocation linkage) lands, switch that call back to the full-record form.
- The audit reports themselves live in a separate worktree (worktree-audit-report-20260516) so they survive across branches. Don't edit them.

Deployment is live at https://audit-fixes-20260516.vercel.app (branch-aliased); redeploy after each substantial batch with vercel deploy --prod --yes --scope zachs-projects-74dd78e7 from the worktree dir.

Session log (2026-05-19):

- Commit e50f248 batched three audit fixes: §9 #13 validation-indicator hover border, §9 #25 drawer backdrop + click-outside (HelpGlossaryPane + SessionSettingsPanel), §12 F-22 AiAttributionChip optional record + G6 prose-tab chip switchover. +6 tests, test count 1679 → 1685. Deploy: dpl_FPWsf4TLyGk8JHLqhchyKy1UKiXN.
