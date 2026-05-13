# Comprehensive User-Flow Audit — Findings

**Date:** 2026-05-13
**Method:** Eight parallel source-code audits, one per user-flow slice, plus a Playwright live walkthrough on the local dev build (= deployed `main` HEAD, commit `ad95250`).
**Authority:** Findings cited with absolute file paths and line numbers. Where two agents independently flagged the same issue, that is noted; those are the highest-confidence findings.
**Scope:** Everything the user named (storage, node-add, animation, errors/warnings popup, layout) plus everything adjacent.

This document is the **findings report**, not the fix. Triage below; fixes await your approval per the format you chose at the start of the session.

---

## TL;DR

- **25 P0 bugs** (broken or data-loss). Several are _catastrophic_: session migration silently corrupts state; user preferences wipe on every reload; manual drag snaps back; cascade-delete is silently broken; adding a node is fundamentally malformed; and the path-to-conclusion animation the user expects **does not exist** (was never implemented — Stream I deferred it to "polish").
- **~32 P1 bugs** (painful but workaroundable).
- **~24 P2 bugs** (polish).
- **Two root causes account for a large fraction of the P0s.** Fixing either is high leverage:
  1. `loadAppState()` is never called at app boot. Every preference/state wipes on reload (named by both persistence + onboarding agents).
  2. The "controlled `nodes` prop without `onNodesChange`" pattern on the React Flow canvas, combined with `structuralHash` omitting `presentation.x/y`, ruins every direct-manipulation interaction (named by both canvas + layout agents).
- **The tests are misleading.** Multiple tests _encode_ the buggy contracts (the migration `OrphanResolution` test asserts the broken shape; the validation-drawer dismissal test hard-codes a literal `frame_id` of `"frame"` masking a partition-key bug). This is why 1531 passing unit tests coexist with a deeply broken UX. The test suite needs integration-level rebuild as part of any fix pass — captured in §4 of this report.

---

## §1 — P0 findings (broken / data loss)

> 25 findings. Where two agents independently found the same root cause, "(2 agents)" is noted.

### Persistence & data integrity

| #        | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Files                                                                                                                                                                                                  | Fix scope                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **P0-1** | `loadAppState()` is **never called at app boot**. Pinned frames, recents, coachmark-dismissals, dismissed-warnings, output-view-tab choices, side-panel-collapsed — _all_ of `AppState` wipes to `DEFAULT_APP_STATE` on every reload, even though `saveAppState` _is_ called and the data sits on disk. (2 agents.)                                                                                                                                                                                            | `src/state/app-state-store.ts:35-42,58,63-71`; `src/main.tsx:12-41`; `src/ui/app-routes.tsx:94-119`                                                                                                    | Small — one-shot `loadAppState()` call at boot, with "not-found → default" fallback                               |
| **P0-2** | CrossTabBus is **dead code**. `crosstab` is destructured in stores but `subscribe` / `publish` are never called. Two tabs on the same frame never see each other's saves; the later save clobbers the earlier.                                                                                                                                                                                                                                                                                                 | `src/persistence/autosave.ts:144-149`; `src/state/{frame,session}-store.ts:36,46/59,69`; `src/main.tsx:14`; `src/persistence/indexeddb-repository.ts:176-198,268-287`                                  | Medium — publish on save, subscribe in store, ignore own echoes                                                   |
| **P0-3** | **Autosave in-flight race drops user edits.** A keystroke that arrives during a flush is written to a slot that gets `delete`d on flush completion, then ignored on the next debounce.                                                                                                                                                                                                                                                                                                                         | `src/persistence/autosave.ts:128-150,165-200`                                                                                                                                                          | Small — check `slot.payload === flushed_payload` before deleting; reschedule otherwise                            |
| **P0-4** | **Broken `parent_version_id` chain.** Rapid edits inside the 5s debounce window each mint a new `version_id`/`version_number` in memory; only the _last_ is persisted. The saved version's `parent_version_id` points at an in-memory intermediate that was never saved. Result: gaps in `version_number` (1→4) and version-history diff/preview crashes traversing the chain.                                                                                                                                 | `src/state/action-runner.ts:336-346`; `src/persistence/autosave.ts:74`                                                                                                                                 | Medium — at flush, re-stamp `parent_version_id` to the prior on-disk version_id                                   |
| **P0-5** | **Cross-tab `app_state.recents` resurrection.** Tab A deletes frame F → `app_state.recents` cleaned, persisted. Tab B still holds F in in-memory recents; next state change in Tab B writes the whole stale `app_state` blob, **reviving the deleted frame in recents**.                                                                                                                                                                                                                                       | `src/state/app-state-store.ts:94-105,111-122,124-133`                                                                                                                                                  | Small (after P0-2 is fixed) — broadcast `frame_deleted`; peers re-fetch                                           |
| **P0-6** | **Session migration silently no-ops all orphan resolutions** (data corruption). `OrphanResolution` requires `source_node_id` for the repository's resolution-map lookup, but `buildDefaultResolutions` and `OrphanCandidateRow.handleKindChange` never set it. The migrated session still references deleted nodes. Compute then produces stale/broken outputs against a frame that no longer has them. **The migration tests encode the bug** (use-preview-migration.test.ts:5-41 enforces the broken shape). | `src/persistence/indexeddb-repository.ts:485-549`; `src/ui/session-migration/use-preview-migration.ts:26-42`; `src/ui/session-migration/orphan-candidate-row.tsx:21-34`; `src/runtime/extras.ts:33-44` | Medium — thread `source_node_id` through the UI, OR key the repository by `carrier_id`. Rewrite tests in parallel |

### Frame-building canvas

| #         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Files                                                                                                                                                                           | Fix scope                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **P0-7**  | **Cascade-delete dialog never opens** for any node with descendants. The `useCascadeConfirmation` hook is called _twice_ — once in `FrameBuildingPage`, once in `CascadeDeleteDialog` — each with its own `useState`. The page's `request(...)` flips the page's copy of `phase` to `"confirming"`; the dialog reads its own copy, which stays `"idle"`, and returns `null`. **"Delete node" silently does nothing** for any non-leaf node. Tests _mock the hook_, hiding the bug. | `src/ui/hooks/use-cascade-confirmation.ts:17-58`; `src/ui/frame-building/frame-building-page.tsx:75`; `src/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog.tsx:7` | Small — hoist state into the page; pass as props                                                                                        |
| **P0-8**  | **Wiring INTO a LogicalGate is impossible.** `edge-validity.ts` slot branches compare `gate_type === "AndGate"` (etc.), but the schema enum uses `"AND"                                                                                                                                                                                                                                                                                                                            | "OR"                                                                                                                                                                            | "NOT"                                                                                                                                   | "IF_THEN" | "UNLESS"`. No branch ever matches; no slot candidates ever offered. **Same mismatch in the canvas gate-glyph map** → all gates render as fallback "⊕" instead of ∧/∨/¬/→/⊘. | `src/ui/canvas/edges/edge-validity.ts:58,65,72,95`; `src/ui/canvas/frame-canvas.tsx:121-127` | Small — fix the strings to match `schema/nodes.ts:107-145` |
| **P0-9**  | **All nodes flicker to (0,0) on every structural change.** When a node/edge is added/removed/renamed, `useLayoutResult` transitions to `{ kind: "computing" }` and `frame-building-page.tsx` only consumes the `"ready"` branch; for 100-500 ms every existing node renders at `(0,0)` until ELK resolves.                                                                                                                                                                         | `src/ui/canvas/layout-consumer.ts:33,46-47`; `src/ui/frame-building/frame-building-page.tsx:78-83`; `src/ui/canvas/frame-canvas.tsx:109`                                        | Small — fall through to `previous_result` for both `"computing"` and `"error"`                                                          |
| **P0-10** | **Dragged nodes snap back to ELK position.** (2 agents.) `structuralHash` omits `presentation.x/y`, so a drag-stop patch is persisted but doesn't trigger re-layout; the canvas then re-reads stale `layout_result.positions` and React Flow's controlled `nodes` prop overwrites the drag.                                                                                                                                                                                        | `src/ui/canvas/layout-consumer.ts:12-18`; `src/ui/canvas/frame-canvas.tsx:76,109,289`; `src/layout/run.ts:29-41`                                                                | Small — include anchored `presentation.x/y` in the hash, OR prefer `node.presentation` over `layout_result.positions` in `buildRFNodes` |
| **P0-11** | **Palette-added nodes are malformed.** `buildNodeDefaults` omits `layer`, `created_at`, `updated_at`. Checkpoint omits `requires_premise` / `requires_authority`. LogicalGate ignores the variant. Palette mints IDs via `Math.random()`, **breaking the constitutional determinism guarantee** (Article II § 2).                                                                                                                                                                  | `src/ui/frame-building/left-pane/node-palette.tsx:64,108-142`; `src/modes/frame-actions.ts:96`                                                                                  | Medium — stamp inside `node_added` handler (also closes a Constitution conformance hole)                                                |
| **P0-12** | **New nodes stack on (0,0).** No default position; the palette emits no `presentation`. Three rapid adds → three overlapping nodes in the top-left corner.                                                                                                                                                                                                                                                                                                                         | `src/ui/frame-building/left-pane/node-palette.tsx:67`                                                                                                                           | Small — compute viewport-center default with `useReactFlow().screenToFlowPosition`                                                      |

### Onboarding & home

| #         | Finding                                                                                                                                                                                                                                                                           | Files                                                                                                                                              | Fix scope                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **P0-13** | **Newly-created frame is invisible on Home** until reopened. `onSubmitWizard` / `AppOnboardingMount.onSubmit` call `createFrame` + `navigate` but never `setRecent`. The home page builds recents from `app_state.recents` only. The user "lost" their just-created frame.        | `src/ui/home/home-page.tsx:58-64`; `src/ui/app-routes.tsx:103-117`                                                                                 | Small                                                 |
| **P0-14** | **Pin star is visually stuck.** Two sources of truth — `pinFrame` writes `app_state.pinned[]`; the card reads `Frame.pinned` (always `false`). Clicking ☆ moves the card into Pinned but the star icon stays empty; click ☆ in Pinned → silent no-op (`includes` short-circuits). | `src/ui/home/frame-summary-card.tsx:99-101,116-118,129-145`; `src/state/app-state-store.ts:111-122`; `src/persistence/indexeddb-repository.ts:323` | Small — compute `is_pinned` from `pinned_set.has(id)` |
| **P0-15** | **Backdrop click silently dismisses onboarding forever.** Default `dismiss_on_click_outside: true` → `onSkip` → `dismissWarning("first_launch")`. User loses onboarding on the very first stray click.                                                                            | `src/ui/onboarding/onboarding-wizard.tsx:27`; `src/ui/primitives/dialog.tsx:72-129`; `src/ui/app-routes.tsx:99-101`                                | Small — pass `dismiss_on_click_outside={false}`       |

### Argument running

| #         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Files                                                                                                                                                                                                                                                                        | Fix scope                                                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0-16** | **Term & Interpretation editor silently discards Notes and Authority.** `void authority_id; void notes;` — the patch shape doesn't carry them. Checkpoint editor at least keeps notes but discards `authority_id`. For a law student building a case, this is the worst-case data-loss bug.                                                                                                                                                                                                                                                                                                                                                                                                | `src/ui/argument-running/item-editors/term-item-editor.tsx:63-64`; `interpretation-item-editor.tsx:57-58`; `checkpoint-item-editor.tsx:50-52`                                                                                                                                | Medium — either remove the fields visually until the patch shape extends, or stash locally with a "won't save" indicator                                                                                                                                                                                              |
| **P0-17** | **No path-through-to-conclusion animation exists.** This is the animation the user named. `argument-overlay-edge.tsx` renders a static dashed bezier — no `stroke-dashoffset`, no `@keyframes`, no transition. `compute_result.primary_path` and `active_set` are never threaded to the canvas. The `pulse-recommended` keyframe exists in `tokens.css:204` and is wired in `node-frame.tsx:129`, but `recommended_next_pulse` is **hardcoded `false`** at `frame-canvas.tsx:61` and never flipped on. The animation infrastructure is half-built; the trigger never fires. Stream I explicitly deferred animation curves to a polish pass — confirming this is _absence_, not regression. | `src/ui/canvas/edges/argument-overlay-edge.tsx:30-42`; `src/ui/canvas/frame-canvas.tsx:61,135-203`; `src/ui/argument-running/output-viewer/path-overlay-tab.tsx:14-34`; `src/ui/styles/tokens.css:204`; `src/ui/argument-running/argument-running-page.tsx:50,68-70,129,150` | Medium — thread `compute_result.primary_path` + `active_set` to canvas; render primary-path overlay edges with a one-shot `stroke-dashoffset` 400-600ms `cubic-bezier ease-out` keyed by edge-id-added; flip `recommended_next_pulse` on for the recommended-next node. Design choice required before coding (see §3) |
| **P0-18** | **"Highlight on canvas" buttons no-op.** The bottom panel plumbs `on_highlight_on_canvas` through three components, but the page never wires it. `canvas_ref.current.zoomToNode` already exists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `src/ui/argument-running/argument-running-page.tsx:158-163`                                                                                                                                                                                                                  | Small                                                                                                                                                                                                                                                                                                                 |
| **P0-19** | **Interview filter chips don't filter.** Click Checkpoint/Term/Interpretation chip → visibly toggles, list unchanged. `passesFilter` checks scope + reason but ignores `state.node_types`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `src/ui/argument-running/interview-pane/interview-filter.tsx:107-115`                                                                                                                                                                                                        | Small                                                                                                                                                                                                                                                                                                                 |

### Validation / errors

| #         | Finding                                                                                                                                                                                                                                                                                                                                                   | Files                                                                                                                                         | Fix scope                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **P0-20** | **Dismiss-warning is silently dead.** `partitionByDismissal` defaults the partition key's `frame_id` to literal `"frame"`, but the drawer's other code paths use the real frame_id. Click × on a warning → it's "dismissed" under one key, displayed under another, never moves. **The test masks this by hard-coding `"frame::V-W-1::n1"`.**             | `src/ui/frame-building/validation-drawer/dismissed-warnings.ts:19` vs. `validation-drawer.tsx:162,204`; test `validation-drawer.test.tsx:131` | Small — pass `frame_id` into `partitionByDismissal`; rewrite test         |
| **P0-21** | **Frame deletion uses native `window.confirm()`**. No type-to-confirm, no destructive styling, no `ConfirmDialog`. The single most destructive action in the app is the least-guarded. Session delete _does_ require typing the title.                                                                                                                    | `src/ui/frame-building/frame-settings/pin-archive-delete-section.tsx:65-72`                                                                   | Small — switch to `ConfirmDialog` + type-to-confirm                       |
| **P0-22** | **Save failures (quota, repo error) are invisible after frame load.** Errors set `frame.error` in the store, but the only UI consumer is `CanvasEmptyState`, gated on `!frame_version`. After first load, `QuotaExceededError` and `RepositoryError` write to state and disappear silently; data continues to fail to persist. No toast primitive exists. | `src/state/frame-store.ts:156-160`; `src/state/session-store.ts:215`; `src/ui/frame-building/frame-building-page.tsx:242-244`                 | Medium — add toast primitive + subscribe to `frame.error`/`session.error` |
| **P0-23** | **Type-to-confirm dialog fires on empty input.** User clicks Delete without typing → `handleDelete` runs, sees mismatch, silently returns. Dialog stays open with no feedback.                                                                                                                                                                            | `src/ui/session-settings/archive-delete-section.tsx:23-27,77-108`                                                                             | Small — pass `confirm_disabled={confirm_text !== title}` + inline hint    |

### Accessibility

| #         | Finding                                                                                                                                                                                                                                                                                      | Files                                                                                             | Fix scope                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **P0-24** | **Closed `<Drawer>` keeps focusable children in the keyboard Tab order.** When `version_history_open=false`, every button, row, and filter inside the off-screen pane is `tab`-reachable. Sighted keyboard users Tab into the void; ARIA contradiction warning. Same for `HelpGlossaryPane`. | `src/ui/primitives/drawer.tsx:125-136`; `src/ui/version-history/version-history-pane.tsx:240-340` | Small — add `inert` attribute when `!open` |

### Mode change

| #         | Finding                                                                                                                                                                                                                                                                                                                                                                                         | Files                                                                                | Fix scope                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **P0-25** | **The Reattach branch of migration is dead.** `enumerateOrphanCandidates` in `runtime/extras.ts` never sets `suggested_kind: "reattach"`, never populates `reattach_candidates`. The `suggestReattach` heuristic lives in `modes/orchestration.ts` — a _shadowed duplicate_ that nothing imports. User can click "Reattach" but no candidates appear and the resolution can't apply (see P0-6). | `src/runtime/extras.ts:88-163`; `src/modes/orchestration.ts:6-13,90-220` (dead code) | Medium — move the heuristic into runtime/extras.ts; delete the modes duplicate |

---

## §2 — P1 findings (painful)

### Frame-building canvas

- **No keyboard delete.** Select node, press Delete/Backspace → nothing. `use-keyboard-shortcuts.ts` covers zoom/pan only; canvas doesn't set `deleteKeyCode` or wire `onNodesDelete`. _Files: `src/ui/hooks/use-keyboard-shortcuts.ts:1-106`; `src/ui/canvas/frame-canvas.tsx:288-300`._
- **Multi-select delete only deletes the first node.** `on_request_delete_multi={(ids) => on_request_delete(ids[0])}`. _Files: `src/ui/frame-building/right-pane/inspector.tsx:53-55`._
- **Inspector "+Target" button for checkpoint options is a no-op.** `on_pick_option_target={() => {}}`. _Files: `src/ui/frame-building/right-pane/inspector-node.tsx:82`; `editors/checkpoint-editor.tsx:157`._
- **Checkpoint drag-routing produces N identical candidates.** Same label "Route checkpoint option here" repeated; already-routed options included. _Files: `src/ui/canvas/edges/edge-validity.ts:120-130,166-167`._
- **Drop-position passed to `on_edge_created` is always `undefined`.** Wrong event ordering: `onConnect` fires before `onConnectEnd` records the drop coord. Popup opens at window center, not near drop. _Files: `src/ui/canvas/frame-canvas.tsx:260-280`._
- **Inspector field edits use uncontrolled `defaultValue` + `onBlur`.** Switch nodes mid-edit → typed text is lost; or worse, the previous node's text leaks into the new node's textarea (DOM input reuse). _Files: `src/ui/frame-building/right-pane/inspector-node.tsx:88-106`; multiple editors._
- **`useEditMode` initial state freezes on first-selected node.** Switch from a checkpoint-with-policy-override to a checkpoint-without → toggle stays on "Edit instance." _Files: `src/ui/frame-building/right-pane/inspector-node.tsx:160-168`._
- **Validation drawer is mount/unmount, not transformed.** No slide animation; flashes. _Files: `src/ui/frame-building/frame-building-page.tsx:274-282`._
- **Manual drag silently un-collapses a collapsed SubQuestion.** Shallow merge in `applyNodePartial` replaces the entire `presentation` object — `collapsed` wiped. _Files: `src/modes/frame-actions.ts:39-41`; `src/ui/frame-building/frame-building-page.tsx:229-235`._
- **ELK is told `INCLUDE_CHILDREN` but the graph has no hierarchy.** SubQuestions don't contain their decomposed children; everything is sibling. The visual outline structure is implied only by edges. _Files: `src/layout/elk-options.ts:12`; `src/layout/elk-mapping.ts:71-97`._
- **Direction hardcoded to DOWN.** Long-narrow arguments read better as RIGHT; no UI control. _Files: `src/ui/canvas/canvas-toolbar.tsx`; `src/ui/canvas/layout-consumer.ts:24`._
- **Worker errors silently swallowed.** No error banner; UI freezes on stale layout. _Files: `src/ui/canvas/layout-consumer.ts:8-10,56-65`._
- **Empty (loaded) frame shows blank canvas.** `CanvasEmptyState` gates on `!frame_version` only. A freshly-created frame with no nodes shows the grid background with zero guidance. _Files: `src/ui/frame-building/frame-building-page.tsx:217-264`._

### Onboarding / home

- **`start_at_template_step` is declared but never read.** "+ New frame from template" entry point is absent; the README acknowledges deferral. Either remove the prop or wire the flow. _Files: `src/ui/onboarding/new-frame-wizard.tsx:13-17`._
- **Pin cap not enforced.** Pin 50 frames freely. The advisor's earlier finding ("no `PinnedCapReached`") is consistent. _Files: `src/state/app-state-store.ts:111-122`._
- **Home search affordance is absent.** Deferred per `src/ui/home/README.md:56-59`. _Files: `src/ui/home/home-page.tsx`._
- **Wizard state survives across closes of the New-frame dialog.** Not a remount; previous title/mode/flavor remain. _Files: `src/ui/home/home-page.tsx:209-216`._

### Argument running

- **Recommended-next is computed in the interview pane but never used on canvas or output viewer.** The canvas's `recommended_next_pulse` keyframe wired in `node-frame.tsx:129` never fires. (See P0-17.) _Files: `src/ui/argument-running/argument-running-page.tsx:50,129`; `src/ui/canvas/frame-canvas.tsx:61`._
- **Recompute indicator only fires on item-editor save.** Premise add/edit/delete from the bottom panel and session-authority operations bypass the bump. _Files: `src/ui/argument-running/argument-running-page.tsx:68-70`._
- **`PremiseAuthoringSection` regenerates Premise id and `created_at` on every keystroke.** Inefficient; `created_at` reflects last keystroke, not original draft. _Files: `src/ui/argument-running/item-editors/premise-authoring-section.tsx:61-77`._

### Persistence

- **`void repo.openOrUpgrade()` is fire-and-forget — boot errors silently swallowed**, UI renders on closed DB. _Files: `src/main.tsx:16`._
- **`searchFrames` is dead in UI.** Index built and maintained; no UI ever queries it. _Files: `src/ui/home/home-page.tsx`; `src/persistence/indexeddb-repository.ts:709-711`._
- **No quota handling.** No `navigator.storage.persist()`, no `estimate()` warning at 80%, no quota-distinct dialog. _Files: `src/persistence/indexeddb-repository.ts:860-869`; `src/state/frame-store.ts:156-160`._
- **`restoreVersion` does a double write when `change_summary` is provided.** Two writes, two re-renders, transient stale summary. _Files: `src/state/{frame,session}-store.ts:105-122/139-157`._

### Mode change

- **Legal direction options labeled as raw enum strings** to a law student. `affirm` → should be `Affirm`. Article III § 2. _Files: `src/modes/transitions.ts:139`._
- **`handleCommit` has no try/catch.** Throw → dialog wedged with `committing=true`, no error. _Files: `src/ui/mode-change/architectural-mode-change-dialog.tsx:112-136`._
- **No "session was migrated" feedback.** Dialog closes silently. _Files: `src/state/session-store.ts:166-181`._
- **"Change flavor" in legal mode flickers a null dialog.** Should be disabled with tooltip. _Files: `src/ui/frame-building/frame-settings/mode-flavor-section.tsx:74-85`._
- **No advisory when flipping general → legal with existing `Frame.positions`.** Dead metadata persists. _Files: `src/modes/transitions.ts:108-207`._
- **No "session output stale" banner on drift.** Only a pill. _Files: `src/ui/argument-running/frame-version-drift-indicator.tsx`._

### Validation / errors

- **Humanization is partial.** Spot-checks: V-FR-3 `"...has 1 Interpretation(s) and no linked_to..."` (compiler diagnostic). V-NODE-8 `"CheckpointOption opt_2 ... satisfies but has no target."` (barely humanized). V-EDGE-1 `"INTERPRETED_AS source type RootQuestion not allowed (allowed: Term)."` (naked code). V-EDGE-3 `"Argument-layer edge ANSWERS present in Frame Version.edges."` (`FrameVersion` broken mid-word; `.edges` lingers). _Files: `src/ui/primitives/humanize.ts`; `src/schema/validation-rules.ts`._
- **Validation runs on every patch with no debounce.** The pill count and severity colors twitch mid-typing. _Files: `src/state/action-runner.ts:355`._
- **No per-field inline form errors.** Empty title in new-frame wizard, session-settings, frame-settings → submit button silently disabled or no-op. _Files: `src/ui/onboarding/new-frame-wizard.tsx:36`; multiple metadata-section.tsx._
- **Error boundary doesn't log.** No `componentDidCatch`. Production: errors swallowed. _Files: `src/ui/error-boundary.tsx:8-96`._

### Visual polish / a11y

- **No focus trap on Drawer, no autofocus on open.** Test file _explicitly_ documents the absence. _Files: `src/ui/primitives/drawer.tsx:66-138`._
- **`Tooltip` overwrites child event handlers** instead of merging — latent footgun. _Files: `src/ui/primitives/tooltip.tsx:47-55`._
- **`IconButton` uses inline-style hover.** Mouse-hovered, then Tab away → hover persists. _Files: `src/ui/primitives/icon-button.tsx:60-70`._
- **`RestoreConfirmDialog` doesn't explain branching.** "The current version and all later versions are preserved" — true but doesn't say the new version's parent is the chosen ancestor (the version tree forks). _Files: `src/ui/version-history/restore-confirm-dialog.tsx:67-71`._
- **`MilestoneFilter` button focus-outline is a misaligned rectangle around an inner pill shape.** _Files: `src/ui/version-history/milestone-filter.tsx:22-80`._
- **No dark mode anywhere.** Both `tokens.css` and `global.css` have zero `@media (prefers-color-scheme: dark)` blocks. Light-only for hours of legal-document work.
- **No responsive breakpoints.** Sub-1024 viewport silently breaks the three-pane layout.

---

## §3 — P2 findings (polish)

Compressed listing — full repros in the per-slice agent reports if you want them. These are the long tail.

- Validation severity icon's hover title is the raw rule_id (`"V-NODE-8"`) instead of the description.
- Drawer rows show identical severity treatment for errors and warnings; only header pills differ.
- Dismissed-warnings disclosure uses ASCII triangles (`▼ / ›`) vs the SVG-icon system elsewhere.
- Bottom drawer pushes 280px of canvas with no resize handle.
- Cascade-delete dialog confirm-label can be very long (`Delete 147 nodes and 283 edges`) inside `size="sm"` dialog.
- Long node titles truncate at 3 lines with no tooltip overflow affordance.
- LogicalGate diamond is 60×60 rendered but 80×80 reserved in ELK → edge attach points off-corner.
- `elk.layered.fixed: "true"` is not a valid ELK key (no-op).
- `fitView` runs once on mount; new nodes off-screen require manual fit.
- Minimap can overlap toolbar/inspector on small viewports.
- `VersionHistoryButton` uses a unicode `↺`; `CompareView` back uses `←`; both inconsistent with the SVG icon system.
- `PreviewBanner` exit is hand-rolled instead of `<Button>`.
- `CompareView` header is `<header><span>` not `<h2>` (no heading landmark).
- `CompareEntryRow` clickable `<div>`s without `role="button"` / keyboard handlers.
- `Pill.variant.border` field is just a color, named misleadingly.
- Mode-cascade `:root` fallback declared _after_ the `[data-mode=...]` selectors.
- `SelectionFooter` disabled-Restore tooltip only — no inline explanation in the read-only Frames tab.
- `:focus-visible` outline on primary buttons is same color as the button bg.
- `humanize.ts` truncated mid-word for compound names (`FrameVersion` → `Frame Version`).
- Confirm-dialog inline-error text missing when the typed input is non-empty-but-wrong.
- StatusSummaryChip doesn't pop on change (the keyframe exists; the Pill isn't wired with the class).
- Inline edit affordances incomplete: PremiseRow edit only edits `statement`; SessionAuthorityRow can't set `jurisdiction` / `is_binding` despite displaying them.
- CheckpointItemEditor renders boolean / multiple_choice / graded identically (no graded slider).
- InterviewSearch isn't debounced.
- SessionAuthorities panel always renders (should hide in personal flavor).
- `relativeTime` returns negative values on clock skew.
- Empty-state CTA visible behind onboarding modal.
- Welcome → wizard has no back affordance.
- `FrameSummary.archived` is checked but the field doesn't exist on `FrameSummary`.
- `version_number` computed from `Math.max(existing)` — concurrent writes from two tabs both compute the same number.
- Search tokenizer is whole-word only; "negl" matches nothing.
- AppState saves the whole blob on every change.
- Dev-only ID chip leaks in inspector if `import.meta.env.DEV` is misset by Vercel build.
- Selected edges in canvas aren't surfaced in Inspector (`handleSelectionChange` discards the edges array).
- Two divergent `OrphanCandidate` types coexist (`runtime/extras.ts` and `modes/orchestration.ts` — the latter is dead code).
- `positions_added` REPLACES `Frame.positions` instead of appending (currently safe; fragile).
- `useModeChangeScan.rescan()` is a redundant `epoch` bump.
- AdvisoryList shows raw rule_ids as headers.

---

## §4 — What the test suite needs

The current 1531-test suite _coexists_ with the bugs above. That's a coverage shape problem, not a count problem. To catch what unit tests can't:

1. **Build `tests/integration/`** (the Vitest scenario-grouped suite the I.10 spec planned and deferred). Each integration test mounts the real `<App>` against fake-IndexedDB + frozen clock + counter UUIDs + MockLlmProvider + main-thread layout shim. Scenarios that would have caught the P0s:
   - "Reload survives `pinFrame`" (catches P0-1).
   - "Two `IndexedDbRepository` instances same DB see each other's writes" (catches P0-2).
   - "Three patches inside autosave window persist all three structurally" (catches P0-3/P0-4).
   - "Delete frame in tab A; verify tab B's next `app_state` save doesn't restore" (catches P0-5).
   - "Migrate session with `discard` resolution → migrated session no longer references the deleted node" (catches P0-6 and dethrones the misleading test).
   - "Cascade-delete a Term with Interpretations → dialog opens; confirm; descendants removed" (catches P0-7).
   - "Drag from Interpretation to AndGate → slot popup shows ≥1 candidate" (catches P0-8).
   - "Add Checkpoint via palette → `applyPatch` payload has `layer`, `created_at`, `requires_premise`, `requires_authority`" (catches P0-11).
   - "After autosave + reload, freshly-typed value is persisted" (catches P0-3 + P0-22 jointly).
   - "Click 'Delete frame' → ConfirmDialog opens, not `window.confirm`" (catches P0-21).
   - "Dismiss a warning → reload → warning still dismissed" (catches P0-1 + P0-20).
   - "Term editor + Notes + Authority → save → reload → fields present" (catches P0-16).
   - "Open drift indicator → migration dialog → orphans listed, default discards, commit → migrated session lacks orphaned premise" (catches P0-6, again).

2. **Expand `tests/e2e/` (Playwright).** Currently one stale smoke test that asserts a `placeholder-root` testid that hasn't existed since I.8 landed real chrome. Replace + add:
   - First-launch happy path: cold load → welcome → wizard → frame-building → add node → drag node → reload → drag persists.
   - Argument-running happy path: open session → answer checkpoint → premise attaches → conclusion status changes (visual assertion).
   - Path-overlay test asserting the overlay is drawn (this is currently a no-op for animation; the test will be the regression seat once P0-17 is implemented).
   - Mode-change happy path: legal → general → conclusion direction picker → commit → frame.mode flipped.
   - Version-history happy path: edit, edit, edit → drawer shows 3 versions → preview v2 → restore v2 → new v4 branches off v2.
   - Keyboard delete + multi-select delete.

3. **A few targeted unit-test additions** beyond integration:
   - `tests/state/app-state-store.persistence.test.ts` — round-trip every `AppState` field across a fresh store instance, mirroring P0-1.
   - `tests/persistence/parent-chain.test.ts` — three rapid patches → flush → chain resolvable end-to-end.
   - `tests/ui/canvas/structural-hash.test.ts` — drag stop produces a different hash AND/OR `buildRFNodes` reflects the drag.
   - `tests/ui/canvas/gate-slots.test.ts` — case per gate variant.
   - `tests/ui/primitives/drawer.tab-order.test.tsx` — closed drawer's children are not tab-reachable.
   - `tests/schema/humanize-coverage.test.ts` — every rule fixture renders without leaving `linked_to`, `INTERPRETED_AS`, `(s)`, broken-camelCase tokens.

4. **Rebuild misleading tests.** Specifically: `tests/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog.test.tsx:17-26` (mocks the hook; needs real-hook integration); `tests/ui/frame-building/validation-drawer/validation-drawer.test.tsx:131` (hard-codes `"frame"` key); `tests/ui/session-migration/use-preview-migration.test.ts:5-41` (enforces the broken `OrphanResolution` shape — should fail until fixed); `tests/ui/argument-running/item-editors/term-item-editor.test.ts` (asserts pure helpers but not Save semantics).

---

## §5 — Suggested triage

Given the volume, here's how I'd suggest grouping fixes if you want to greenlight in waves:

**Wave A — P0 user data correctness (must fix before any other work):**
P0-1 (loadAppState), P0-3 (race), P0-4 (parent chain), P0-6 (migration corruption), P0-7 (cascade delete), P0-11 (malformed nodes — also closes a Constitution conformance hole via P0-11's `Math.random()` removal), P0-16 (silently discarded fields), P0-20 (dismiss-warning), P0-22 (invisible save failures).

**Wave B — P0 direct-manipulation UX (the moment the user touches anything):**
P0-8 (gate wiring), P0-9 (0,0 flicker), P0-10 (drag snap-back), P0-12 (palette stack), P0-13 (frame invisible on home), P0-14 (pin star), P0-15 (backdrop dismiss), P0-18 (highlight-on-canvas), P0-19 (filter chips), P0-21 (window.confirm).

**Wave C — P0 animation / a11y / mode-change:**
P0-17 (path animation — design choice first), P0-24 (closed-drawer focus), P0-25 (reattach dead). These are all medium-scope.

**Wave D — P0 cross-tab:**
P0-2, P0-5. Implement together once the bus is real.

**Wave E — P1 (32 of them).** Triaged into smaller batches as we work through the slices.

**Wave F — P2 (24+).** Polish-pass session.

**Wave G — Test rebuild.** Integration suite + E2E happy paths. Could ride alongside Wave A so we don't reintroduce the same bugs.

---

## §6 — Question for you before fixes start

**P0-17 (path-to-conclusion animation) needs a design call from you, not code-only.** Three options I'd put on the table; I'll implement whichever you pick (or another design you sketch):

- **(a) Progressive trace.** When a session reaches `output.shape === "determinate"` (the conclusion settles), animate the primary path overlay edges in sequence — each edge's dash offset slides from the source node forward over ~120 ms, total trace ~600-800 ms. Conclusion node pulses once at the end. Communicative; reads like "here is the reasoning."
- **(b) Active-set heatmap.** Edges and nodes on the active path adopt a higher-contrast color smoothly (300 ms fade); off-path edges/nodes recede to a desaturated treatment. Easier to take in at a glance.
- **(c) Both: trace once, heatmap stays.** First-time entry into a determinate state plays (a); afterward the canvas holds (b). On subsequent recompute that _changes_ the path, (a) replays.

The other P0s I can fix without design input.

---

_End of audit. Per the format you chose, no code changes have been made yet. Triage above; tell me which waves to start and whether you have a preference on P0-17 design._
