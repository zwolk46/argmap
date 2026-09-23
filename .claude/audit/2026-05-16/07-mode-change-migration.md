# Audit: Mode Change & Session Migration

Scope: `src/ui/mode-change/`, `src/ui/session-migration/`, `src/modes/`, and integration points in
`src/ui/frame-building/frame-building-page.tsx`, `src/ui/argument-running/argument-running-page.tsx`,
`src/ui/frame-building/frame-settings/`, and `src/ui/argument-running/frame-version-drift-indicator.tsx`.

Findings are user-perspective, not fixes. Severity buckets: **Critical / High / Medium / Low / Nit**.

---

## CRITICAL

### C1. `TargetModePicker` has no actual target-mode picker
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/target-mode-picker.tsx:12-72`

The dialog is titled "Change architectural mode" but the component named `TargetModePicker` only
renders two read-only labels ("Currently: …", "Switch to: …") plus a flavor radio set. There is no
control for choosing the target mode. The target is hardcoded as the inverse of current at dialog
open (`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:29`:
`const initial_target_mode: Mode = current_mode === "legal" ? "general" : "legal";`) and never
mutated. A user who opens the dialog from a legal frame cannot stay in legal mode and change only
the flavor or cancel without first noticing this — the only commit path is legal→general.
Discoverability and reversibility (Article III §5) are both compromised: the user cannot inspect or
compare available targets before committing.

### C2. `architectural_mode_changed` overwrites all Frame positions with `positions_added`
`/Users/zacharywolk/zwolk/argmap/src/modes/frame-actions.ts:256-258`

```
if (patch.positions_added && patch.positions_added.length > 0) {
  frame_partial.positions = patch.positions_added as Position[];
}
```

`frame_partial.positions` is *assigned*, not appended. The dialog only sets `positions_added` when
`current_positions.length === 0`
(`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:82-83,
125`), so in normal use this branch only runs on first-time creation. But the patch contract itself
allows callers to pass `positions_added` for a frame that already has positions, and the dispatch
silently replaces them. There is no safeguard, no merge semantics, no warning surface. A later
session calling `applyPatch({ kind: "architectural_mode_changed", positions_added: […] })` on a
populated frame would erase existing positions and the audit trail (change_summary) would not
mention it.

### C3. "Reattach" with zero candidates can be selected and committed
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/orphan-candidate-row.tsx:12-31, 62-78`

`defaultReattachTarget` returns `undefined` when `reattach_candidates` is empty or missing
(line 13). `handleKindChange("reattach")` then emits `{ kind: "reattach", source_node_id, target_node_id: undefined }`
(lines 22-27). The `ResolutionPicker` shows the "Reattach" segment unconditionally, and the
target-select row only renders when `reattach_candidates.length > 1` (line 64). The user can pick
Reattach for any orphan, see no target chooser, click Migrate, and ship an undefined target_node_id
into `session_store.migrateToFrameVersion` with no validation in the dialog. There is no inline
error explaining "no reattach candidates available for this carrier" — the affordance silently
degrades to a discard-equivalent or a downstream repository error depending on Repository handling.

### C4. Cancel discards all staged state with no confirmation
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:194-196`

`<Button variant="secondary" data-testid="mode-change-cancel" onClick={onClose}>Cancel</Button>` —
clicking Cancel after the user has typed several positions and chosen multiple per-Conclusion
directions wipes all of that with no "are you sure" guard. ESC and click-outside (via Dialog
defaults, `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/dialog.tsx:18-19, 100-101`) do the
same. For a mode-change dialog whose body is non-trivial to refill, this risks user-rage data loss.

---

## HIGH

### H1. Conclusion direction editor row keeps red-error styling after resolution
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/conclusion-direction-editor.tsx:55-58`

```
borderLeft: "var(--border-thick) solid var(--color-severity-error)",
background: "var(--color-severity-error-bg)",
```

Both styles are applied unconditionally. After the user picks a valid `ConclusionDirection`, the
row remains visually in the error state. There is no read of `current_value` to switch to a "now
resolved" appearance. With many Conclusions to resolve, the user has no visual progress feedback —
they have to scan each select control rather than scan a list of red→green transitions. Pairs with
the canonical severity-error left-stripe + wash design (which the row implements), but the row
never *leaves* that state once it enters.

### H2. PositionsInlineEditor only renders when frame has zero positions
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:82-83, 159-166`

`need_positions = target_mode === "general" && has_conclusions && current_positions.length === 0`.
If the frame already has one or more positions, the dialog will not show the inline editor — even
when those positions don't match what the user actually needs for the new general-mode
direction picker. The user has to cancel, open Frame Settings → Positions, edit, return to
Change Mode. The dialog's `available_positions` (line 140) does fold staged + current together, but
there is no UI surface for editing or adding while in the dialog if `current_positions` is
non-empty.

### H3. `scanFlavorChange` does not address premise-kind vocabulary differences
`/Users/zacharywolk/zwolk/argmap/src/modes/transitions.ts:224-256`

The scan only checks `Authority` nodes for visibility/relabel impact. The task explicitly calls out
that premise kind vocabulary differs between personal and academic flavors, and asks what happens to
existing premises with kinds not in the new vocabulary. Nothing in `scanFlavorChange` examines
premises. Schema confirms `premise_kind_in` is a `SatisfactionCondition` kind
(`/Users/zacharywolk/zwolk/argmap/src/schema/satisfaction-policy.ts:22, 91, 114, 126`), so the
data exists, but the scan ignores it. A flavor switch with premises tagged with the old vocabulary
goes through with no advisory and the policies become silently inert or broken.

### H4. `SegmentedToggle` arrow keys mutate selection
`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/segmented-toggle.tsx:29-43`

```
if (e.key === "ArrowRight" || e.key === "ArrowDown") {
  e.preventDefault();
  const next = (idx + 1) % options.length;
  setFocusedIdx(next);
  onChange(options[next].value);    // <-- commits on focus move
}
```

ArrowRight/ArrowLeft/ArrowDown/ArrowUp do not merely move focus; they call `onChange`. In the
migration dialog's `ResolutionPicker`
(`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/resolution-picker.tsx:19-25`), a stray
arrow press by a keyboard user who is tabbing through candidates changes the resolution for that
candidate. ARIA radio convention is to move focus on arrow keys and only commit on Space/Enter or
explicit click — this implementation conflates the two. For a destructive choice like
Discard/Reattach/Keep, this is dangerous on long lists.

### H5. Default-satisfaction-policies survive mode change silently
`/Users/zacharywolk/zwolk/argmap/src/modes/frame-actions.ts:239-265`

The `architectural_mode_changed` handler writes only `mode`, optional `flavor`, and optional
`positions` into `frame_partial`. `default_satisfaction_policies` (which may reference
`premise_kind_in` with legal-only kind names, or other policy conditions that no longer parse the
same way in the new mode) is silently preserved. `buildModeChangeSummary`
(`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/change-summary.ts:8-12`) reports only "mode
changed: legal → general (personal)" with no mention of which policies persist or which become
inert. From a deterministic auditability standpoint (Article III §3), this is a hidden carryover.

### H6. LLM-hook / pending suggestion state is not reset on mode change
`/Users/zacharywolk/zwolk/argmap/src/modes/frame-actions.ts:239-265`,
`/Users/zacharywolk/zwolk/argmap/src/state/session-store.ts:188-216`

The `architectural_mode_changed` patch produces a new `FrameVersion` but does not touch
`pending_suggestion` or `suggestion_status` (defined on the session store but reachable via
LLM-hook flows on frame edits). A stale AI suggestion authored against the old mode's vocabulary
can remain in the suggestion drawer (`SuggestionDrawer` is mounted unconditionally at
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-building-page.tsx:522`). The user has
no in-dialog signal that pending suggestions may now be stale.

### H7. Migration dialog has no preamble explaining what the user is migrating
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/session-migration-dialog.tsx:97-128`,
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:42-101`

The dialog title is "Migrate session". Header is bare. Body goes straight into spinner/empty/list.
No "From v3 → v5", no "this session was authored against an older version of the frame", no link to
review the frame diff. The only context is the small drift pill in the top bar
(`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:53-55`)
which the user has just dismissed by clicking it. Inside the dialog, the user has lost the version
numbers.

### H8. Migrate button enabled in `loaded_empty` phase with no clear purpose
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/session-migration-dialog.tsx:95`

`can_migrate = !migrating && (phase.kind === "loaded" || phase.kind === "loaded_empty")`. When
nothing needs resolution, the body explains "Migrating is safe — no manual decisions needed"
(`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:51-55`) but
does not explain *why* the user would still click Migrate. The user has to infer that clicking
re-pins the session's `frame_version_id` to the new id even though nothing else changes. A confirm
copy-block clarifying "this updates the session's frame snapshot from vN to vN+k" would help.

### H9. `commit_error` catch only handles synchronous throws
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:105-138`

`handleCommit` calls `frame_store.getState().applyPatch(...)` synchronously and wraps it in
try/catch. But `applyPatch` is a synchronous dispatch; downstream persistence writes happen
asynchronously and emit errors through a different path (toast bridge / store error field). If the
persistence write fails after the dialog has already closed (`onClose()` runs unconditionally on
line 129 before the await of any downstream work), the user sees the dialog disappear and may
believe commit succeeded; the failure surfaces later, decoupled from the action.

---

## MEDIUM

### M1. Mode change is two-clicks deep with no top-bar surface
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-settings/mode-flavor-section.tsx:47-57`

To change mode, the user must open the frame settings drawer (chrome top-bar
FrameSettingsButton), scroll to the Mode & Flavor section, click "Change mode" button. There is no
direct entry from the top-bar `ModeFlavorChip`
(`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/...`), no right-click affordance, no keyboard
shortcut. For a frequently-used architectural action, this is buried.

### M2. No read-only / archived-frame protection on mode change
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-settings/mode-flavor-section.tsx:32-86`,
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-settings/metadata-section.tsx:48-61`

The `Frame` schema has an `archived?: boolean` field
(`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:90-91`), and `MetadataSection` displays an
"archived" banner (metadata-section.tsx:48-61). But `ModeFlavorSection`'s "Change mode" button
checks only `on_open_mode_change_dialog` presence and (for flavor) `mode === "legal"`. An archived
frame can still trigger the full mode-change dialog and commit a new `architectural_mode_changed`
patch — there is no guard for `frame.archived === true`.

### M3. Mode change disabled-state on `argument-running` page is implicit
`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx`

The mode-change dialog is mounted only in `FrameBuildingPage`
(`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-building-page.tsx:29, 478-490`); in
`ArgumentRunningPage` it is absent. Good. But the implicit nature of this — no banner, no
explanation when a user goes to argument-running and the mode-flavor chip is read-only — leaves
the user uncertain whether they can change mode and how. The "Frame Settings" button on
`ArgumentRunningPage` opens `SessionSettingsPanel` instead
(`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:84`), with an
"on_open_frame_settings" callback that navigates the user back to FrameBuildingPage
(`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:236-239`).
The cognitive load is real: where do I change mode? Answer: navigate page.

### M4. PositionsInlineEditor has no dedupe, no length limits, no description field
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/positions-inline-editor.tsx:16-21`

```
function commitDraft(): void {
  const trimmed = draft.trim();
  if (!trimmed) return;
  props.onPositionStaged({ id: props.generateId(), label: trimmed });
  setDraft("");
}
```

No check for duplicate labels among staged or current positions. No max length. No description
field. The "real" `PositionsSection`
(`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-settings/positions-section.tsx:81-110`)
has both a label and an optional description. Inconsistency: a position created from the
mode-change dialog is missing a piece the canonical editor expects, leading to drift between
where positions are created.

### M5. `attemptTransition('architectural', …)` is recomputed on every staging change but `rescan()` is a no-op
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/use-mode-change-scan.ts:21-53`,
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:89-96`

`useModeChangeScan` already includes `positions_key` in its `useMemo` deps (line 48). The
`rescan()` call inside `onPositionStaged`/`onPositionRemoved`
(`architectural-mode-change-dialog.tsx:91, 95`) bumps an `epoch` (use-mode-change-scan.ts:52) that
only forces an extra recompute when the inputs were the same — but the inputs already changed
because `staged_positions` updated. So `rescan()` is redundant double-work on every staging event,
fired *before* the React state update has committed (so the epoch bump and the useMemo dep change
race). Symptom may be transient flicker or one-frame stale scan. The dialog "feels" correct most of
the time but the contract is muddled.

### M6. Mode-accent in conclusion-direction-editor chip uses `current-accent` for both ends of transition
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/conclusion-direction-editor.tsx:75-87`

The chip shows `{editor.current_direction_kind} → {editor.required_direction_kind}` using
`color: var(--color-mode-current-accent)` and `background: var(--color-mode-current-accent-bg)`.
The "before" and "after" of the transition both inherit the *current* mode's accent. The
mode-accent cascade convention is for "target" elements to use the target's accent token — here
both ends share the same color, defeating the transition signal.

### M7. Reattach with exactly one candidate hides the target identity
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/orphan-candidate-row.tsx:62-78`

The reattach-target `<select>` only renders when `reattach_candidates.length > 1` (line 64). When
there is exactly one candidate, the row commits `target_node_id` to that single candidate via
`defaultReattachTarget` (lines 22-27) but never displays *which* node the carrier will be reattached
to. The user clicks Migrate trusting the system's choice with no inline label.

### M8. Empty-scan and empty-migration messages mix tone and depth
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/scan-result-body.tsx:22-42`,
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:49-55`

Mode-change empty: "No items to address — mode change ready to commit." (sharp, action-cued).
Migration empty: "Nothing in this session points at frame nodes that have moved or been removed.
Migrating is safe — no manual decisions needed." (longer, hedge-flavored). These are the same
pattern (empty state, ready to proceed) but read as different products.

### M9. `flavor_disabled` reason in mode-flavor section uses dev-jargon fallback title
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-settings/mode-flavor-section.tsx:31-34`

```
const disabled_title = "Coming in I.9d";
```

If `on_open_mode_change_dialog` is undefined (the `can_change = false` branch), the button title
attribute is "Coming in I.9d" — a dev milestone label. End users hovering see an internal
versioning string with no explanation of when they will be able to change mode.

### M10. Conclusion direction editor select has no required* indication once user picks "Pick … direction"
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/conclusion-direction-editor.tsx:99-106`

The placeholder option `<option value="">Pick {editor.required_direction_kind} direction</option>`
is selectable forever. If the user accidentally re-selects the empty option, `selected` becomes
empty and the Commit button disables; but there is no visual indication of *which* row regressed.
The user has to scan for the "Pick …" placeholder among the resolved rows.

### M11. Position staging committed on every "rescan" — but `rescan()` doesn't actually re-fetch positions
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/positions-inline-editor.tsx:13-21`,
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:89-96`

`onPositionStaged` calls `setStagedPositions(prev => [...prev, p])` and then `scan.rescan()`. The
scan's `attemptTransition` (`transitions.ts:60`) takes the freshly-passed `positions` array — but
the `staged_positions` state is still the pre-update reference for one render. The user sees the
new position label appear in the inline editor *one render before* the scan reflects it (the empty
"need positions" branch may still be active).

### M12. `change_summary` string is the only user-facing receipt of the mode change
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/change-summary.ts:8-12`

```
return `mode changed: ${left} → ${right}`;
```

The commit produces no toast, no inline diff preview, no "undo within 5s" affordance — only this
lowercase string is recorded into the `frame_partial.change_summary` (frame-actions.ts:263), and
the dialog calls `onClose()` immediately afterward (architectural-mode-change-dialog.tsx:129).
The user has no in-app confirmation that the architectural change committed — they see the dialog
vanish, no toast, and have to read the version history to verify.

### M13. No virtualization for advisory lists / orphan candidate lists
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/advisory-list.tsx:19-72`,
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:84-100`

Both `AdvisoryList` and `MigrationDialogBody` render full lists with no windowing. A frame with
50+ Authority nodes (legal → general) would produce 50+ rows in
`MODE-CHANGE-AUTHORITY-LEGAL-FIELDS-INERT`; a session with hundreds of orphan carriers (large
checkpoint-heavy session, frame restructured) produces a hundreds-row scrolling dialog. The
dialog primitive caps height (`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/dialog.tsx:230`:
`maxHeight: "calc(100vh - var(--space-8))"`) so the user will scroll inside the body — fine for
dozens, slow for hundreds.

### M14. `AdvisoryList` shows raw rule_id as the user-facing section heading
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/advisory-list.tsx:22-32`

```
<section data-testid="advisory-group" data-rule-id={rule_id}>
  <header style={…}>{rule_id}</header>
```

Headings like `MODE-CHANGE-REQUIRES-AUTHORITY-INERT` are surfaced verbatim. A law student looking
at "MODE-CHANGE-IS-JURISDICTIONAL-INERT" reads like a system error code, not an advisory category.
There is no human-readable mapping table even though the `message` body is friendlier (e.g.,
"Checkpoint 'cp-1' has requires_authority = true; this flag is legal-only and becomes inactive
metadata in general mode").

### M15. AdvisoryList row's "node pill" is disabled when no `onNodeFocusRequested` is wired
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/advisory-list.tsx:44-67`

The dialog calls `<AdvisoryList advisory={…} />` without supplying `onNodeFocusRequested`
(see `ScanResultBody` `/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/scan-result-body.tsx:92`).
The pill renders disabled, with `cursor: "default"`, but visually still pill-shaped. A user
expecting "click pill → jump to node" gets a non-interactive pill with no indication of why. From
within a mode-change dialog there *is* no canvas to jump to, but the pill should not exist (or
should be styled as a non-button label).

---

## LOW

### L1. Flavor-change dialog uses `ConfirmDialog`; mode-change uses `Dialog`
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/flavor-change-dialog.tsx:38-56`,
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:142-207`

Two sibling concepts use two primitives. The flavor dialog inherits ConfirmDialog footer behavior
("Switch" / "Cancel"), the mode dialog rolls its own DialogFooter. Visual rhythm and button
language drifts between the two.

### L2. `inverseFlavor` baked into frame-building-page — not testable in dialog
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-building-page.tsx:51-53`

```
function inverseFlavor(current: Flavor | undefined): Flavor {
  return current === "personal" ? "academic" : "personal";
}
```

If the user is in `personal` flavor and the only "Change flavor" path is via this dialog, the
target is *always* `academic`. There is no "pick the target flavor" radio inside FlavorChangeDialog
— it commits straight to the inverse. For a user who clicks "Change flavor" by accident, there is
no exit other than Cancel after the dialog opens with the new flavor already chosen.

### L3. `previewMigration` failure has no user-facing copy hint about retry vs. cancel
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:58-82`

The failed branch shows `phase.error.message` (a probably-developer string) plus a Retry button.
There is no explanation of what to do if retry doesn't help ("network issue? try again later;
data issue? contact support; missing-frame error? open Frame Settings"). The user is left with a
raw error and a single retry button.

### L4. `useToast` push only on successful migration; no toast on canceled or empty migration commit
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/session-migration-dialog.tsx:82-92`

Success toast only fires after `migrateToFrameVersion` resolves. For an empty migration (re-pin
only, P-only), the toast still says "Session migrated to the new frame version." — true but
indistinguishable from a substantive migration. No copy variation for the empty case.

### L5. Architectural mode-change-dialog commits ordered direction resolutions by node_id, but staging order is preserved
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:109-114`

```
for (const [node_id, direction] of [...direction_resolutions.entries()].sort((a, b) =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
)) {
```

Determinism-good. But the rendered inline editor list is in `nodes.sort((a,b) =>
a.id.localeCompare(b.id))` order (`transitions.ts:133`). On a frame with conclusion nodes named
out-of-order (e.g., `c-zebra`, `c-alpha`), the user sees them in alphabetical order — which is
not the structural / DFS order the rest of the app uses (`computeInterviewOrder`,
`/Users/zacharywolk/zwolk/argmap/src/modes/interview.ts:58-109`). Inconsistent ordering between
the mode-change dialog and the canvas / interview pane.

### L6. PositionsInlineEditor's "Required: define at least one position" copy doesn't bind to the Commit button
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/positions-inline-editor.tsx:33-41`

The hint is plain prose in the editor section. The Commit button's disabled state
(`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/architectural-mode-change-dialog.tsx:200`) is
not labeled with an accessible name explaining why. A screen-reader user hears "Commit mode
change, disabled" with no in-context reason.

### L7. Migration dialog `migrate_error` clears only on phase change away from loaded/failed
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/session-migration-dialog.tsx:37-41`

```
if (preview.phase.kind !== "loaded" && preview.phase.kind !== "failed") {
  setMigrateError(null);
}
```

If the user retries the migration after a failed commit and the preview is still in `loaded` state,
the stale `migrate_error` box stays visible alongside the new attempt. There is no "clearing on
retry" semantic — the error sticks until the user closes the dialog.

### L8. Conclusion direction editor select width is fixed to 180px regardless of option labels
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/conclusion-direction-editor.tsx:93-98`

```
minWidth: "180px",
```

A `Position` label of "Defendant's interpretation of statute § 47(b)(2) excludes …" gets clipped or
forces an awkward `<select>` ellipsis. Legal-direction labels are short ("Affirm", "Reverse")
which is fine, but general-mode position labels can be arbitrarily long.

### L9. Discoverable-but-static "Frame v3 · v5 available" pill in argument-running has no permanent badge for users in mid-session
`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:32-56`

The drift indicator is a subtle warning-colored pill in the chip slot of the top bar. There is no
periodic re-surfacing (e.g., a banner) if the user dismisses the dialog. A user who clicks the pill,
sees the migration dialog, then cancels — the pill remains, no escalation. After many cancels there
is no escalation; ergo someone running long sessions against a moving frame may forever ignore
drift.

### L10. `migration-dialog-body` Retry returns the dialog to `loading` but doesn't reset error chrome
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/migration-dialog-body.tsx:58-82`

The Retry button calls `props.onRetry` which bumps epoch in `usePreviewMigration`
(`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/use-preview-migration.ts:55, 88`).
That triggers `setPhase({ kind: "loading" })` (line 63). The error message is replaced by the
spinner. Good. But the *commit-time* `migrate_error` (separate state on the dialog) is not cleared
by Retry (L7).

---

## NIT

### N1. PositionsInlineEditor staged-position remove button uses raw "×" with bespoke styling
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/positions-inline-editor.tsx:49-58`

Code comment says "KEEP RAW: tiny inline × glyph in a staged-position row; bespoke micro-control."
acknowledges the deviation from the icon system, but the per-row remove pattern differs from
PositionsSection's "Remove" button (positions-section.tsx:91-99) which uses `variant="destructive"`.
Same conceptual action, two different glyphs.

### N2. `target-mode-picker.tsx` "Currently" and "Switch to" copy is sentence-case while button label is title-case
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/target-mode-picker.tsx:26, 35`

"Currently: legal", "Switch to: general (personal)" — but the body labels in
ConclusionDirectionEditorRow's chip use uppercase: `textTransform: "uppercase"`
(`conclusion-direction-editor.tsx:83`). Internal inconsistency.

### N3. Migration dialog body has no per-section preview of what *each kind* means
`/Users/zacharywolk/zwolk/argmap/src/ui/session-migration/orphan-candidate-group.tsx:12-18`

`HEADER_LABELS` maps to "Premises", "Argument edges", etc. — fine, but no per-section help text
explaining what the section is or why these items are listed. A first-time migrating user does not
know what an "Interpretation selection" is or why it has been orphaned.

### N4. Conclusion-direction-editor `current_value?.kind === "legal"` ladder is brittle for future direction kinds
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/conclusion-direction-editor.tsx:31-36`

The selected-value resolution checks `legal` then `general`. If a third direction kind ever appears
(future evolution), the row silently falls through to `""`. Brittle code style, no exhaustiveness
check.

### N5. `change-summary.ts` summary string is lowercase, sentence-fragmented, and uses unicode arrow
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/change-summary.ts:11`

`mode changed: legal → general (personal)` — the arrow (`→`) renders fine in modern browsers but
may degrade in plain-text version-history exports (logs, CSV).

### N6. FlavorChangeDialog title hardcodes "Switch to" wording
`/Users/zacharywolk/zwolk/argmap/src/ui/mode-change/flavor-change-dialog.tsx:38-44`

`title={`Switch to ${target_flavor} flavor?`}` — the architectural mode-change dialog uses
"Change architectural mode" while the flavor dialog uses "Switch to academic flavor?". Two
different verbs for two sibling actions.

### N7. Drift indicator pill `data-has-drift="false"` renders disabled pill with no severity icon
`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/frame-version-drift-indicator.tsx:52, 53-55`

When `!has_drift`, the pill renders "Frame v{n}" with a neutral border and disabled state. This is
indistinguishable from an interactive control until the user hovers. Style-wise it competes with
chips/buttons nearby in the top bar.

---

## Tally

- **Critical:** 4
- **High:** 9
- **Medium:** 15
- **Low:** 10
- **Nit:** 7

**Total: 45 findings**
