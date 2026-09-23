# Argument Running Page Audit

Scope: `src/ui/argument-running/**` (page, two-pane chrome, interview pane, item editors, output viewer, bottom panel, top-bar slots, status summary chip, frame-version drift indicator).

Files referenced (absolute paths):

- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/two-pane-layout.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/status-summary-chip.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-pane.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-list.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-row.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-filter.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-search.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/recompute-indicator.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/empty-state.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/item-editor-host.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/checkpoint-item-editor.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/term-item-editor.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/interpretation-item-editor.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-reuse-suggestions.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/authority-attachment-section.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/notes-field.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/bottom-panel.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-pool.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-row.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/session-authorities.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/session-authority-row.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-viewer.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-view-tabs.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/decision-tree-tab.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/path-overlay-tab.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-empty-state.tsx`

Severity buckets used: CRITICAL, HIGH, MEDIUM, LOW, NIT.

---

## CRITICAL

### C1. Checkpoint `requires_authority` does not gate Save — the editor silently lets the user proceed without an Authority
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/checkpoint-item-editor.tsx:27` and `:147-149`.

`can_save` is `selected_option_id !== null && premise_result !== null` (line 27). When `is_legal && node.requires_authority` the editor surfaces an `<AuthorityAttachmentSection>` (line 147-149) but does NOT require `authority_id` to be set before save. The user can press Save with no authority attached; the editor will fire `premise_added` + `checkpoint_answered`, the runtime classifies the checkpoint as `indeterminate` (`/Users/zacharywolk/zwolk/argmap/src/modes/interview.ts:165-170`), the row stays in the interview list, and the user has no in-editor explanation for why their answer didn't count. The "binding behavior" the spec implies for `requires_authority` is reduced to a soft post-hoc warning surfaced only by the interview re-ordering.

### C2. Checkpoint editor's "Notes" textarea is not persisted to the Premise
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/checkpoint-item-editor.tsx:24`, `:38-48`, `:151`.

Compare to `TermItemEditor` (`term-item-editor.tsx:60-65`) and `InterpretationItemEditor` (`interpretation-item-editor.tsx:34-38`) which both enrich the new `Premise` with `{ ...(notes.trim().length > 0 ? { notes } : {}) }` before dispatching `premise_added`. The Checkpoint editor only forwards `notes` into the `checkpoint_answered` patch's `answer.notes` field (line 55) — the Premise itself loses the notes. Two practical consequences: (a) the Premise rendered in the bottom-panel Pool will not show notes that the user typed during a Checkpoint answer; (b) re-using that Premise later from a different editor will see an empty `notes` field even though the user clearly recorded reasoning. Asymmetry across editors is itself confusing.

### C3. Empty-state "All resolved" treats `frame_version_snapshot` missing the same as zero items, masking load failures
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-pane.tsx:97-102`.

The condition `items.length === 0 || !frame_version` collapses two very different states into the same empty UI. If `frame_version_snapshot` is somehow `null` (e.g., a malformed session row, a migration-in-progress crash), the user sees the "All items resolved. Conclusion: …" celebration view (`empty-state.tsx:11-54`) instead of an error. The user could even click "Save snapshot" against a broken session.

### C4. `restoreVersion` and `migrateToFrameVersion` set new session/version state but never invoke `bumpRecompute` — drift indicator and recompute pulse miss the largest possible event
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:72-79`.

`compute_result_ref` IS the watched value, so in principle this should fire. But the page subscribes via `useSessionStore((s) => s.compute_result)` and the page-level ref `last_compute_ref` is initialized once. On a `restoreVersion` or `migrateToFrameVersion` the store `set(...)` replaces `compute_result`, the effect compares identities, and the pulse should bump — fine. The bug surfaces in the OPPOSITE direction: the `bumpRecompute()` manual hop on `on_saved` (line 197) double-counts whenever an `applyPatch` produces a new compute_result AND `on_saved` fires (it does, in every editor save). Result: a quick double pulse on every item-editor save, then a single pulse on premise/authority edits. Inconsistent feedback, especially since the dot uses `key={props.counter}` to remount (`recompute-indicator.tsx:13`), so two near-simultaneous bumps drop the animation entirely (the second remount cancels the first mid-keyframe).

---

## HIGH

### H1. Interview filter chips use generic "background-accent"/"text-accent" tokens that match the mode-accent — but the same tokens drive the recommended-next row highlight and the type-icon stroke, producing visual collision when both are active
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-filter.tsx:138-141` and `interview-row.tsx:86-88`.

An active filter chip uses `--color-background-accent` (mapped to `--color-mode-current-accent-bg` per `/Users/zacharywolk/zwolk/argmap/src/ui/styles/tokens.css:107`) and the recommended-next row uses the same `--color-mode-current-accent-bg`. With a chip active and a recommended-next row both visible, the user perceives two equally weighted "highlights" — one for filter UI, one for the recommended-next pill — and cannot tell at a glance which is "the thing to act on." The chip should use a neutral accent or a different intensity.

### H2. Interview list always sorts jurisdictional ABOVE merits — there is no way to surface a critical merits item even when it is the runtime's recommended-next
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-list.tsx:27-56`.

`InterviewList` renders the `<SectionHeader label="Jurisdictional questions" />` section first regardless of where the recommended-next item lives. If the recommended-next is a merits row and there is any unresolved jurisdictional row above it, the user must scroll past the entire jurisdictional section to find the row the system itself has chosen as next. The "Recommended next" badge on that row is invisible until scrolled into view. For a typical sessions with many jurisdictional checkpoints this could mean the recommended-next is below the fold on load.

### H3. Interview row text truncates with no tooltip/title — long Checkpoint questions, Interpretation statements, and breadcrumb chains are unreachable without selecting the row
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-row.tsx:127-149`.

The statement span (line 127) and breadcrumb span (line 137) both use `whiteSpace: "nowrap"; overflow: "hidden"; textOverflow: "ellipsis"` but the `<button>` carries no `title` attribute (line 68-74) and there is no aria-label fallback. Hover yields nothing; the only way to read the full text is to click the row (which opens the editor). For a law-school workflow where checkpoint questions can run 200+ characters, this is a real friction.

### H4. Status summary chip's "complete · {conclusion_label}" label can be missing if the Conclusion node has neither `direction.value` nor `statement`, producing "(no conclusion)" even when output is determinate
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/status-summary-chip.tsx:19` and `/Users/zacharywolk/zwolk/argmap/src/state/selectors.ts:85-94`.

`findConclusionLabel` returns `c.direction?.value ?? c.statement`, both optional fields. When the underlying Conclusion node has neither, the chip renders "complete · (no conclusion)" — a confusing mixed signal (we resolved, but to nothing nameable). The user will likely interpret this as a runtime bug. The chip should hide the "·" tail when no label is available, or use a friendlier fallback ("resolved" alone).

### H5. Frame-version drift indicator is the only entrypoint to the migration dialog AND it is a `disabled` button when there is no drift — there is no way to manually re-snapshot a session to a newer frame version
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:24-26` and `argument-running-page.tsx:99-101`.

When `has_drift === false`, the button is `disabled` and the only onClick handler is gated by drift. There is no "force refresh against current frame" or "compare" affordance. The user cannot inspect the migration UI proactively, which means they only ever see the migration dialog when the frame has actually advanced — never before, never as a preview. Coupled with H7 below (no read-only mode), the session is effectively pinned with no manual unpin.

### H6. Drift indicator copy says "Frame v{N} · v{M} available" but the same chip is the only escape hatch — clicking it opens the migration dialog directly; there is no two-step "review changes first" flow
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:23` and the `title` at line 27-31.

The hover title says "open migration dialog" and the click handler is `props.on_open_migration_dialog`. Migration is destructive (it replays the session against a new frame version, which can orphan checkpoint answers and interpretation selections). A two-step flow — "View what changed" → "Migrate" — would match the cost of the action; the current single-click is too lightweight.

### H7. No read-only mode is reachable through `ArgumentRunningPage` — restoring a prior version always creates a NEW version and the page has no preview-only state
File: `/Users/zacharywolk/zwolk/argmap/src/state/session-store.ts:139-156` and `argument-running-page.tsx:27-31`.

`ArgumentRunningPageProps` has no `read_only` prop. `restoreVersion` ALWAYS creates a new version (line 147-151) — there is no "view this old version inline" path. Users browsing version history of an argument session cannot just look without effectively committing a restore. Worse: the auto-save still fires on any `applyPatch` from the page even in a "viewing" intent.

### H8. `recompute_counter` bump is debounced incorrectly — it fires on every `compute_result` ref change which means every keystroke through `applyPatch` triggers it (premise-pool inline edit, session-authority inline edit)
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:72-79`.

The effect compares `last_compute_ref.current !== compute_result_ref` and bumps. Each Premise-Row edit-save (`bottom-panel/premise-row.tsx:60-64`) dispatches `premise_edited`, which produces a new compute_result, which fires the pulse — even though the user's edit was "rename the statement, no logical change." The pulse becomes noise; it loses its semantic meaning ("a recompute that may have changed your conclusion"). Premise edits should only pulse when they would actually move a status_map value.

### H9. The premise-authoring `<textarea>` placeholder is `"What does this premise assert?"` but the field has no error state or validation feedback for blank/whitespace-only premises before save
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:138` and `:73-78`.

`emit_new` returns null when statement.trim() is empty, which means `premise_result` stays null and `can_save` stays false in the parent editors. The Save button just stays disabled with no in-line explanation pointing at the empty textarea. Users will hunt for what they are missing. A field-level "Required" hint would clear this up.

### H10. The premise-authoring section disables the Premise statement textarea when reuse is selected, but provides ONLY a `Create new instead` button — no inline edit of the reused premise's statement
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:137-147` and `:174-182`.

Reused-premise statement is read-only (line 137-138). The user who reuses a premise then realizes they want to tweak one word must click "Create new instead" (line 178) — losing the reuse linkage — type a near-identical statement, and now has two near-duplicate premises in the pool. Should allow "edit and detach" or "edit the reused premise globally".

### H11. Decision-tree tab clicks every branch box on its FIRST condition's gate_node_id — branches with multiple conditions cannot be drilled into the OR-arm
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/decision-tree-tab.tsx:107-110`.

`onClick={() => { const first = b.conditions[0]; if (first) on_branch_clicked(first.gate_node_id); }}`. For branches with `conditions.length > 1` (which is the entire point of `ConditionalBranch.conditions[]`), the user can only ever jump to the first condition's gate. The remaining conditions are invisible from this tab.

### H12. Decision-tree boxes use fixed 200×56 px sizing and a single-column layout — long `required_value_label`s and long `resulting_conclusion` strings will be truncated by the `<text>` element with no overflow handling
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/decision-tree-tab.tsx:19-22`, `:123-128`.

`DEFAULT_BOX_WIDTH = 200`, `DEFAULT_BOX_HEIGHT = 56`, and the text is plain `<text>` without `<foreignObject>` wrapping or `<title>` tooltips. Long names get cropped by the SVG box with no scrollbar or hover-to-read affordance. Plus the layout is single-column (`y: i * (box_h + v_gap)`), so a `conditional` output with 8 branches becomes an 8-row vertical strip — no tree visualization at all despite the tab name.

### H13. Prose tab "Suggest rewrite" button does not handle invocation errors visibly inside the prose surface
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:96-107`.

The button disables on `status === "invoking"` (line 102) but if the hook fails or returns a fallback, the prose tab itself shows no inline feedback — error surfacing is delegated to `session_store.error` (set in `session-store.ts:197`) which the page renders only via the loading/empty branches (not while a session is loaded). The user clicks "Suggest rewrite", nothing visible happens, and they have no recourse other than re-clicking.

### H14. Bottom-panel "premise count" pill uses the `status_open` variant (orange/amber per token mapping) regardless of how many premises exist, even when zero — a visually loud chip telling the user "0 premises"
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/bottom-panel.tsx:46-48`.

When there are 0 premises, the panel renders an `status_open`-variant pill with text "0 premises" — using a status color that elsewhere means "needs attention." A more neutral or muted variant should be used; or hide the chip when the count is zero.

### H15. Bottom panel has no visible scrollable indicator in the collapsed state — the user does not know there is more content available
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/bottom-panel.tsx:21-53`.

Collapsed state shows pills inline only (no chevron animation, no "1 of N" affordance). The toggle button uses `angle-up` icon (line 43), which is fine, but there is no preview of what's inside — just labels. New users will not discover the panel.

### H16. Bottom-panel "authority count" pill uses `neutral` variant — visually identical to a non-pill label, defeating the purpose of distinguishing premise count from authority count
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/bottom-panel.tsx:49-51`.

`variant="neutral"` (per `pill.tsx:35` Variants) is a low-contrast pill. Combined with `status_open` for the premise count, the visual hierarchy is "premise count screams, authority count whispers." There is no semantic reason for that — both are inventory counters.

---

## MEDIUM

### M1. `OperatingModeToggle` is passed `validation={[]}` in argument-running — the toggle's "warnings" dialog will never appear when switching BACK to frame_building (correct) but the same component's switch-to-argument logic is dead code in this page
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:42` and `operating-mode-toggle.tsx:34-49`.

Passing an empty validation array hides the fact that the user is switching FROM argument-running TO frame_building. The toggle's switch-back path (`onSwitchToFrame`) does not check validation (correct), but the empty array is still misleading; future readers of the code will wonder if a real validation source was forgotten. A `current_mode="argument_running"` toggle should not accept a `validation` prop at all in this surface; it's irrelevant.

### M2. `SessionTitleEditor` commits on blur and Enter but swallows whitespace-only edits without any visual hint
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:101-117`.

`commit()` silently snaps back to the existing title on whitespace-only input. The user who deletes the title text expecting to retype sees the old title pop back as soon as they click away — feels like an undo or a glitch. The comment on lines 105-109 acknowledges this UX choice but offers no inline feedback.

### M3. `SessionTitleEditor` does not surface server-side save errors — title edit silently sends `session_metadata_edited` patch via `applyPatch`, which schedules auto-save, and a failed save is only visible via the toast bridge
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:112-114`.

After commit, the editor flips back to display mode regardless of save outcome. If the autosave fails, the title in the DOM appears to have saved but it hasn't.

### M4. Frame-title in the argument-running top-bar is always `read_only` — there is no way to rename the parent Frame from the session page
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:55`.

Defensible (you don't want surprising frame edits from a session), but users will hunt for it. The breadcrumb slash separates `<FrameTitle read_only />` from the editable session title (line 56-66) with a thin "/" — clickability of the frame title is ambiguous; some users will click and get nothing.

### M5. `selected_item_id` is local state on the page — toggling the version-history drawer or closing/reopening the help pane keeps it; but navigating away and back loses it
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:50`.

If the user is mid-editing a Checkpoint, accidentally clicks "Home", returns, the editor is gone. No persisted "last-edited item" in app state. For a long session this is friction.

### M6. The right pane shrinks the OutputViewer from `flex: 1` to `flex: 2` when an editor is open, but the editor itself has `minWidth: 340; maxWidth: 460` — at small window widths (under ~900px), the output viewer can become unreadable
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:170` and `:182-184`.

Two pane plus a 340–460px editor leaves the canvas/prose with possibly < 400px width, on which the prose tab's `maxWidth: 640px` becomes a moot constraint and the path-overlay canvas becomes claustrophobic. No mobile breakpoint or stacked-layout fallback.

### M7. `TwoPaneLayout` is not resizable — the left pane is locked at `280px` by default (`two-pane-layout.tsx:17`) with no drag-handle
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/two-pane-layout.tsx:12-20`.

`left_width` is a prop but the page never passes one (`argument-running-page.tsx:147-149`) and there is no resize handle. Users with long Checkpoint questions or long breadcrumbs cannot widen the interview pane.

### M8. Two-pane layout collapses bottom panel to a fixed 32px height when not expanded, with no transition smoothing the swap between `1fr / 32px` and `1fr / 180px`
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/two-pane-layout.tsx:22-30` and `:73`.

The transition is declared on the bottom-row wrapper (`transition: "height var(--duration-medium) var(--ease-emphasized)"`, line 73) but the height is driven by the grid's `gridTemplateRows`, not by the wrapper's `height`. CSS Grid does not transition `gridTemplateRows` in all engines reliably — Safari handles this poorly and the row will snap rather than animate. Visual jank when toggling.

### M9. Recompute indicator has no `aria-live` and is `aria-hidden` — assistive technology users get no "recompute happened" feedback at all
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/recompute-indicator.tsx:15`.

The pulse is visual-only. Screen readers will not announce that the session was recomputed. Status summary chip changes (e.g. "open" → "complete") will also not be announced unless wrapped in `aria-live="polite"`.

### M10. Status summary chip is not interactive — clicking it does nothing, despite being a primary-glance affordance and a logical entrypoint into the prose tab or the interview list
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/status-summary-chip.tsx:34-38`.

A `<Pill>` wrapped in a `<span data-testid="status-summary-chip">` — pure text. The task description hints at "click behavior" being expected. None is wired.

### M11. Recommended-next pulse animation runs even when the user has not interacted with the page (initial load) — startup feels jumpy
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:74-79` and `recompute-indicator.tsx:23-27`.

`last_compute_ref.current` initialized to `compute_result_ref` from first render. But on initial mount, `loadSession` (line 90) sets compute_result asynchronously — when it arrives, the effect compares against `last_compute_ref.current` (which still holds the initial null) and bumps the counter. The user sees a pulse on every fresh load, conflating "computed" with "recomputed."

### M12. AuthorityAttachmentSection sorts authorities by `id.localeCompare` — but IDs are opaque ULIDs/UUIDs, so the order in the dropdown bears no relation to recency, alphabetical order of citation, or relevance
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/authority-attachment-section.tsx:87-88`.

Picking from a 20+ authority list in random ID order is hostile. Should sort by `citation` (alphabetical) or by `updated_at` (recent first).

### M13. AuthorityAttachmentSection "New session authority" inline form takes only `name` + `citation` — no jurisdiction, no is_binding, despite legal-mode UX needing both
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/authority-attachment-section.tsx:148-181`.

In legal mode the SessionAuthorityRow below shows jurisdiction and binding (`session-authority-row.tsx:128-142`) but the only way to set these is later from the bottom panel — there is no "create with binding info" path from the item-editor. The new Authority is created blank.

### M14. AuthorityAttachmentSection ignores `frame_authority_opted_in` in the live (non-test) path because `authority_attachment-section.tsx:42-47` reads `frame_mode` / `frame_flavor` from the frame store but `frame_authority_opted_in` is only ever a prop — there is no live data flow from a Frame field
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/authority-attachment-section.tsx:14-21`, `:47`.

The hooks (`useFrameStore`) wire mode/flavor, but `frame_authority_opted_in` comes only via props. The CheckpointItemEditor and InterpretationItemEditor never pass it, so for `personal` flavor frames the authority section is silently hidden even if the Frame opted in. A "set me up to handle authorities" Frame setting cannot reach this page.

### M15. NotesField has no character counter and no max length — pasting an entire page of notes is allowed, and the auto-expand caps at `max_height: 180px` (`notes-field.tsx:13-37`) with no internal scrollbar
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/notes-field.tsx:30-35`.

`textarea` with `resize: "vertical"` but no overflow style; relies on browser default. For long notes the bottom of the textarea will scroll within the textarea but the user can't tell their input is being truncated visually.

### M16. The `<input type="search">` in InterviewSearch (`interview-search.tsx:21`) ships with browser-default "clear" UI in WebKit/Blink — but the placeholder is just "Search items…", no hint that the search is fuzzy-substring vs. exact, and no "no results" copy when the filter empties the list
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-search.tsx:18-27` and `interview-pane.tsx:97-102`.

When `search_text` doesn't match anything, the empty state shown is the same as "no items at all" (`InterviewEmptyState`'s copy: "Nothing open. As you bring in premises…") — the user thinks the session is empty when really their search just doesn't match.

### M17. Premise-row's "orphan" pill (`premise-row.tsx:160-169`) is severity_warning — but new premises in a Pool (a-la "+ Add Premise" from the panel) START orphaned by definition, so the very next interaction is the user adding a premise and immediately seeing a warning pill
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-row.tsx:160-169`.

The friction is most acute right after `+ Add Premise` (premise-pool.tsx:32-37) — the row appears inline-edit mode with no statement, immediately marked "orphan" via a warning pill. The user has not had a chance to attach it. The pill should be suppressed for unsaved/blank premises or until a threshold (e.g., > 5 minutes since creation).

### M18. Premise-row delete on a premise with 0 edges proceeds without confirmation, but inline-edit save on a brand-new blank premise creates a valid Premise with empty statement
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-row.tsx:198-201` and `premise-pool.tsx:32-37`.

`+ Add Premise` inserts a Premise with `statement: ""` immediately. The row appears in inline-edit mode, but if the user clicks Cancel (line 119) instead of typing, the empty Premise stays persisted (no rollback). Combined with the orphan warning (M17), the user is left with a phantom warning-marked Premise they didn't intend to keep.

### M19. SessionAuthorityRow's "Add Authority" creates an Authority with `citation: ""` — and the row immediately shows the editing input but if the user navigates away without saving, the unnamed Authority is persisted forever
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/session-authorities.tsx:24-37` and `session-authority-row.tsx:111-117`.

Renders `<em>(unnamed)</em>` for blank citation (line 117) — visible orphan-ish state with no remedy other than "Edit → fill → Save." Same pattern as M18 for premises.

### M20. Output viewer's "Path overlay" tab uses `recommended_next_id` to pulse a node on the canvas, but the `recommended_next_id` prop is recomputed on every interview-items selector call — this re-renders the canvas overlay on every premise edit even when the recommendation has not changed
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:83-86` and `output-viewer.tsx:99`.

`interview_items.find(...)` re-runs on every store snapshot. The id is the same string most of the time but a fresh string equality check still triggers downstream props through `FrameCanvas` (path-overlay-tab.tsx:81). Worth memoizing.

---

## LOW

### L1. The output viewer's tab order assumes `path_overlay` is the default when there is an active path — but for a fresh session, `path_overlay` would be empty (no active path), so the page falls back to `prose` (`output-viewer.tsx:56-57`) — meaning a brand-new session starts on the PROSE tab and the user must click "Path overlay" to see the canvas
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-viewer.tsx:56-58`.

Defensible (prose at least shows something), but the page-level mode chip says "argument running" and the canvas is the conceptual home — landing in prose with empty content (`output-empty-state.tsx`) feels like nothing is happening.

### L2. Output view tabs are NOT keyboard-navigable with arrow keys — only Tab key works
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-view-tabs.tsx:53-69`.

`role="tab"` is set per ARIA pattern, which implies arrow-key navigation within the tablist. The component does not implement `onKeyDown` for ArrowLeft/ArrowRight. ARIA pattern violation; screen-reader users following the tab pattern will be confused.

### L3. The "Computing…" inline spinner in output-view-tabs (`output-view-tabs.tsx:71-87`) renders only while `computing===true`, which is only set on the `!compute_result || !session` branch (`output-viewer.tsx:74`). Mid-session recompute (via patch dispatch) never shows the spinner — the user sees no live "I'm computing now" signal beyond the tiny pulse dot in the interview pane
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-view-tabs.tsx:71-87` and `output-viewer.tsx:74`.

For long-running recomputes (which can happen on large frames with many gates), the user has no in-place spinner. The pulse dot is 8×8 px in the interview pane, easy to miss.

### L4. Prose tab "Copy" and "Copy as Markdown" buttons sit side-by-side with identical "Copy" leading verb — they look identical at a glance
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:80-95`.

Two ghost-variant Buttons with text "Copy" and "Copy as Markdown" — small (`size="sm"`) and same color. Mistakes likely. The first button has no clarification of what format it copies (just plain text).

### L5. Prose tab "Suggest rewrite" button styling matches the Copy buttons (all ghost, all sm) — the action that consumes an LLM hook is visually identical to the action that copies text to clipboard
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:96-107`.

AI invocation deserves visual differentiation. The Sparkle icon (`leading={<AiSparkle />}`) helps a little but the button chrome is still the same as Copy.

### L6. Prose tab `whiteSpace: "pre-wrap"` on the canonical block respects double-newlines but the `prose_summary` from the runtime is a single deterministic template walk — no rendered headings, no bold/italic — long determinate prose is a wall of serif text
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/prose-tab.tsx:112-124`.

For multi-paragraph outputs the user has nothing but `\n\n` separators. A minimal Markdown render or paragraph splitting would help readability without violating F-002.

### L7. Recompute indicator pulses via the `key={props.counter}` remount trick — when the user resizes the page or focuses away/back, the component's parent rerenders and the key resets, replaying the animation
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/recompute-indicator.tsx:12-15`.

If parent state changes (filter chip click, search input change) cause a rerender, the indicator might pulse unintentionally because `key` is just the counter value and React will reconcile per identity. Actually safe with `key=`{counter}`, but the 600ms animation duration means rapid keystrokes in the filter chip toggle could chain animations.

### L8. Empty state's "Save snapshot" button uses `<Spinner size={12}>` while saving — but the button text changes ("Saving snapshot…") simultaneously, doubling the spinner indication
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/empty-state.tsx:41-52`.

Either spinner OR text, not both. Cognitive overhead.

### L9. Bottom-panel "Premises & authorities" heading uses `argmap-section-heading` class but the wrapper renders an `<aside>`-less `<div>` — not a landmark
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/bottom-panel.tsx:21-110`.

For assistive technology, the bottom panel is just a div with content. Region role would help.

### L10. Frame-version drift indicator's title says "v{N} available" but `version_number` is a 1-based count — for new sessions `session_version_number` is often `1` (e.g., "Frame v1 · v2 available") which is technically correct but mixes case ("v1" is shorthand, "v2" is the same shorthand, no spelled-out "version")
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:54`.

Minor copy nit. Consider "Frame v1 (v2 available)" with parens for clarity.

### L11. Item-editor host listens to `keydown` globally for Escape (`item-editor-host.tsx:26-32`) — if any other modal dialog (suggestion drawer, migration dialog, session settings panel) is also listening for Escape, both will fire
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/item-editor-host.tsx:27-31`.

A window-level handler beats focus-trap layering. Bug surface for stacked-modal closing.

### L12. CheckpointItemEditor renders the question in an `<h3>` (`checkpoint-item-editor.tsx:84`) without semantic heading level coordination — the page already has the title in `<TopBar>` and the section may have other `<h3>`s in the bottom panel — duplicate h3s break heading hierarchy
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/checkpoint-item-editor.tsx:84-91`, `term-item-editor.tsx:95-103`, `interpretation-item-editor.tsx:89-97`.

Same for Term and Interpretation editors. Screen-reader heading navigation will land on item-editor question as one of several h3s without context.

### L13. ItemEditorHost `Escape` handler closes the editor, but the editor has its own onKeyDown handler (e.g. `checkpoint-item-editor.tsx:67-75`) — both fire; for the Checkpoint editor onClose is called twice
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/item-editor-host.tsx:27-31`, `checkpoint-item-editor.tsx:71-74`.

`item-editor-host.tsx` adds a `window`-level keydown, then the editor's div adds another keydown via React. Both fire (the editor's first if focused, then the window handler). Calls `on_close()` twice in rapid succession. Harmless today but a footgun for adding cleanup logic.

### L14. The premise-reuse suggestions block (`premise-reuse-suggestions.tsx:93-128`) uses `font-size-xs` rows with no icon — visually undistinguished from the rest of the form
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-reuse-suggestions.tsx:113-127`.

Reuse selection is a meaningful semantic action ("I'm linking to an existing premise"), but the rows look like a sub-list of the form, not a discrete affordance. A small "↻ reuse" icon would clarify.

### L15. The `+ New session authority` button label uses lowercase "authority" / "source" via `label.toLowerCase()` (`authority-attachment-section.tsx:204`) — "Source" → "source" reads fine but "Authority" → "authority" inside a sentence "+ New session authority" is OK; what's missing is the case where the button is the ONLY entrypoint and feels like a low-priority action
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/authority-attachment-section.tsx:196-206`.

Ghost variant + "+" prefix = "I'm casual." But adding a session-scoped authority is a substantive action.

### L16. Premise-pool's empty state copy mentions "factual or contextual claims" but checkpoint kinds include `normative`, `value`, `assumption` — copy gives a constrained mental model
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-pool.tsx:65-67`.

Premises support 10 kinds (`premise-authoring-section.tsx:20-31`); the empty-state copy reduces it to two. Misleading.

### L17. PremiseRow's "Highlight on canvas" IconButton plumbs through to `props.on_highlight_on_canvas?.(targets)` — but if the premise has 0 edges, the button click sends an empty array and the canvas does nothing
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/premise-row.tsx:171-184`.

The IconButton should be disabled when `counts.total === 0` — currently it appears clickable but has no effect. Confusing.

### L18. SessionAuthorityRow's `binding`/`persuasive` text (line 134-142) shows `(not set)` as a neutral string — no visual cue that this is a missing required attribute in legal mode
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/bottom-panel/session-authority-row.tsx:128-142`.

`(not set)` in parentheses — looks like an informational note, not a "you need to do this."

### L19. OutputViewer falls back to the `prose` tab as default but never re-evaluates if the path becomes active later in the session — once set to `prose`, the persisted tab choice (`output_view_tab_choice_by_frame`) sticks even when path_overlay becomes meaningful
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/output-viewer.tsx:52-65`.

A user who started a fresh session on prose, then resolved enough to have a primary_path, will stay on prose unless they explicitly click "Path overlay." OK as a respect-user-choice but the initial default would benefit from a one-time re-evaluation.

### L20. PathOverlayTab uses `useLayoutResult(frame_version)` which is async; while `kind === "computing"` the canvas shows `previous_result` if any, but on FIRST load there is no previous — `layout_result` is `null` and the canvas (presumably) renders nothing with no spinner inside PathOverlayTab itself
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/path-overlay-tab.tsx:55-63`.

Layout-pending state has no UI surface here. The PathOverlayTab passes `layout_result={null}` to FrameCanvas; whatever the canvas does in that case is the user experience (likely empty canvas). A local "Laying out…" spinner would help.

### L21. Decision-tree empty state explanation uses `font-size-sm` with `maxWidth: 480` (`decision-tree-tab.tsx:71-77`) — but the surrounding output viewer pane is wider, leaving the explanation text crammed in the top-left
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/decision-tree-tab.tsx:67-81`.

Not centered, not styled as a hero — looks like body text in an empty room.

### L22. The interpretation-item-editor uses radio buttons for "Supports" vs "Contradicts" (`interpretation-item-editor.tsx:122-142`) with no inline help — users may not understand the semantic of these terms in this context (Premise SUPPORTS or CONTRADICTS the interpretation)
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/interpretation-item-editor.tsx:122-142`.

Quick tooltip on each radio would clarify.

### L23. Term-item-editor's "term-linked-notice" copy (`term-item-editor.tsx:107-121`) is shown for linked terms but does not explain WHERE to go to set the interpretation for the linked target — dead-end message
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/term-item-editor.tsx:107-121`.

"Selecting an interpretation here will not affect the linked target" — what is the user supposed to do? No action prompt.

### L24. The InterviewFilter chip labels for `reasons` (`interview-filter.tsx:92-103`) use the raw enum strings: "open", "indeterminate", "contested", "best_inference_pending" — last one is a tech term unfamiliar to non-engineers
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-filter.tsx:25-30`, `:92-103`.

A law student looking at "best_inference_pending" will not immediately know what it means.

### L25. The recompute indicator color (`recompute-indicator.tsx:21`) uses `--color-mode-current-accent` — same as the recommended-next row border (`interview-row.tsx:93`). Two accent uses adjacent in the header.
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/recompute-indicator.tsx:21`.

Visual noise when both are visible.

### L26. The `<select>` dropdown for premise kinds (`premise-authoring-section.tsx:155-171`) defaults to a `default_kind` based on legal mode — "found" for legal, "empirical" for general — but the user gets no explanation of the difference between, say, "found" and "stipulated" without consulting the help pane
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:33-44`, `:155-171`.

A "?" icon next to "Kind" with quick definitions would aid learning.

### L27. The premise-authoring section's `draft_meta_ref` (`premise-authoring-section.tsx:70`) stabilizes the Premise id+timestamp across keystrokes, but if the user clears the textarea entirely, the seed is reset (`:75-77`) — meaning the next typing session generates a new id, losing any in-flight `authority_id`/notes attached to a prior draft (the parent component still holds them, but the Premise id mismatch is silent)
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:73-78`.

Edge case but real. A user who types, deletes, re-types is invisibly creating a brand-new Premise.

---

## NIT

### N1. `argument-running-page.tsx:131` uses inline `height: "100vh"` — does not account for browser UI chrome on mobile (Safari's address bar)
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:131`.

### N2. Multiple components hard-code `"var(--color-text-primary)"` instead of letting the `<button>` inherit text color — verbose
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-row.tsx:119`, etc.

### N3. The `data-testid` proliferation includes `data-reason={item.reason}` and `data-selected={selected ? "true" : "false"}` — fine for tests but adds DOM noise
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/interview-row.tsx:72-74`.

### N4. The recompute pulse uses inline `style.animation` with magic strings ("argmap-recompute-pulse 600ms var(--ease-soft)") — should be a CSS class
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/interview-pane/recompute-indicator.tsx:23-27`.

### N5. `PremiseAuthoringSection` AI button text "Draft from fact pattern" (`premise-authoring-section.tsx:201`) is specific to legal mode but the button is shown whenever `enable_g11` is true — the copy assumes a legal use case
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/item-editors/premise-authoring-section.tsx:191-203`.

`enable_g11` is set to `is_legal` in checkpoint-item-editor.tsx:144, so this is consistent in practice, but the prop is generic.

---

## Cross-cutting observation

The argument-running surface is feature-rich but suffers from a recurring "soft-fail" pattern: required-ish fields (authority on Checkpoints requiring it; non-empty premise statement; non-empty authority citation) are not enforced at submit time. The runtime catches some of these and demotes the result to `indeterminate` or `best_inference_pending`, which then re-routes the item back into the interview list with no surfacing of WHY. The user-facing experience is "I answered, why did the item come back?" The fix pattern is consistent across editors: a single validation-summary footer in `ItemEditorHost` and a `validates()` method on each editor's props would let each editor declare its requirements once, and have the host render a "missing X" hint inline.

---

## Tally

CRITICAL: 4  
HIGH: 16  
MEDIUM: 20  
LOW: 27  
NIT: 5  

Total: 72 findings.
