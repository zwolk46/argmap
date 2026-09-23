# Version History Pane & Preview/Compare/Restore — Findings

Scope: `src/ui/version-history/*` plus `src/persistence/diff.ts` and the pane / preview-provider mount in `src/ui/app-routes.tsx`. Covers pane chrome, the version tree, milestone filter, tabs, selection footer, compare flow, frame and session preview views, the preview banner, the restore confirm dialog, and the two async data hooks. Focused on user-perceived bugs across keyboard, focus, accuracy, and recovery flows.

## CRITICAL

### Session preview renders old premises against the *current* frame snapshot — visual lie about the user's history
- **Where**: `src/ui/version-history/session-preview-view.tsx:58, 71-78, 122-132`; `ArgumentSessionVersion` has no `frame_version_snapshot` field (`src/schema/session.ts:125-140`).
- **User experience**: When the user previews an older session version, the canvas the user sees is built from `useSessionStore.session?.frame_version_snapshot` — i.e., the frame that the *live* session is currently authored against, not the frame version that the previewed `ArgumentSessionVersion` was authored against. If the live session has been migrated (`migrateToFrameVersion`) to a newer frame, the preview shows the old premises and overlay edges laid on top of nodes the user never saw when that version existed. Premise targets may even point at nodes that no longer exist in the current snapshot, producing dangling edges. The pane sells the preview as a faithful "this is what your session looked like at v3"; what renders is "today's frame with v3's premises pasted on top."
- **Details**: The preview also breaks the determinism guarantee under Article II §2 — replaying the same `version_id` could produce different visual output depending on whether the live session has been migrated in between. The legal-mode use case explicitly requires reproducibility of the way an argument looked at a moment in time.

### `FrameVariant` always sets `allow_restore={true}` while `SessionVariant`'s Frames tab does not — restore from Frame Building can destroy session anchor
- **Where**: `src/ui/version-history/version-history-pane.tsx:86, 137`; `src/state/frame-store.ts:105-123`
- **User experience**: A user editing a frame in Frame Building who has any number of existing argument sessions anchored against frame versions can select an older frame version and click Restore. The store calls `repo.restoreFrameVersion(frame_id, ancestor_version_id)` and updates `frame.current_version_id`. Every session that opens after this still anchors against its own historical `frame_version_id`, but the user has no warning at all from this dialog that they are creating a new "head" that diverges from where their sessions live. The dialog copy mentions only "previous versions remain on their own branch" (`restore-confirm-dialog.tsx:67-70`) — it never mentions sessions. A first-time user reasonably assumes restoring is a quick rewind; they don't expect their sessions to now appear "behind" the frame head.
- **Details**: There's no advisory listing how many sessions reference earlier versions, no per-session migration prompt, no follow-up offer to migrate. Combine this with the no-toast restore success path (separate finding below) and the user has near-zero feedback that the restore happened at all.

### `useVersionSummaries` resets to `loading` + empties the list on every save — pane blanks and reflows constantly
- **Where**: `src/ui/version-history/use-version-summaries.ts:27-58`
- **User experience**: The hook subscribes to `frame_current_id` / `session_current_id`. Every autosave, every milestone save, every restore, every cross-tab save bumps `current_version_id`. The effect then unconditionally runs `setResult({ status: "loading", summaries: EMPTY })` *before* calling `listFrameVersionSummaries`. The pane's `VersionTree` is unmounted and the `InlineLoading` placeholder is rendered (`version-history-pane.tsx:272-279`). If the user is in the middle of selecting / scrolling / hovering a row, their selection is *also* lost because the parent's `setSelectedVersionId` state holds an id that no longer matches any rendered row's `aria-pressed` (the row component is gone). With autosave firing on a 5-second debounce, leaving the pane open while editing produces a constant "Loading versions…" flicker every few seconds.

## HIGH

### `SessionVariant` issues `useVersionSummaries({frame_id: "__unused__"})` when `frame_id` is null — fires a real listFrameVersionSummaries query that returns nothing or errors
- **Where**: `src/ui/version-history/version-history-pane.tsx:109, 117-119`
- **User experience**: In the `argument_running` route while the frame hasn't loaded yet, the `frame_id` selector returns `null`. The session variant forwards the literal string `"__unused__"` as a `FrameId` into `useVersionSummaries`. The hook does not gate on null; it calls `repository.listFrameVersionSummaries("__unused__")`. Depending on the backend (Supabase RLS, IndexedDB filter), this returns an empty array or throws — but either way it costs a round-trip and writes an `error` status into hook state. If the user happens to flip to the Frames tab during that window they see the error state ("Failed to load versions"). Even when the tab isn't visible, the hook is mounted and runs because both `session_summaries` and `frame_summaries` are unconditionally constructed at the top level of `SessionVariant`.

### `compare-view.tsx` passes `from_id`/`to_id` typed as `FrameVersionId` even when entity is `session` — fragile but compiles only because `SessionVersionId` is a branded alias
- **Where**: `src/ui/version-history/version-history-pane.tsx:259-262`; `src/ui/version-history/compare-view.tsx:25-32, 277-282`
- **User experience**: The pane's `CompareView` consumer casts `compare_state.from_id as FrameVersionId` and the same for `to_id`, even when `entity_kind` is `session`. The cast lies; CompareView's `loadFrameVersion(from_id)` / `loadSessionVersion(from_id)` branch is the only reason this works. If a future change ever reads the typed `from_id` for a frame-specific operation in the session path (or vice versa), it will silently use the wrong code path. The user-visible effect today is no bug — but it's a latent bug protected only by the discriminator.

### Compare-view session rows render the entity DB ID instead of the statement
- **Where**: `src/ui/version-history/compare-view.tsx:158-252` (every session-row builder uses `statement_preview: id` or `statement_preview: e.id`)
- **User experience**: When the user runs a Compare against a session version, every "Premise added/removed/edited", every "Checkpoint response added/edited", every "Authority added", and every "Interpretation selection added" row in the compare body shows a UUID-shaped DB ID as the primary text. There is no human-readable preview of the premise text, checkpoint name, authority citation, or term/interpretation label. Compare to the Frame branch, which renders `node.question`/`node.statement`/`node.name`/`node.citation` (see `nodeStatementPreview` at `compare-view.tsx:43-50`). The session compare feature is effectively unusable for a non-technical user — they see lists of opaque IDs and have to click each one to navigate before they know what changed.

### `frame_summaries` is fetched even while the Sessions tab is active
- **Where**: `src/ui/version-history/version-history-pane.tsx:113-119`
- **User experience**: `SessionVariant` unconditionally calls *both* `useVersionSummaries({ kind: "session", ... })` and `useVersionSummaries({ kind: "frame", ... })` at the top of the component, regardless of which tab is open. Every time the user clicks the pane open in Argument Running, two list queries fire in parallel. For users with hundreds of frame versions but only a few session saves, the session-only experience is paying for the frame query they never see. Compounds with the `useVersionSummaries` reset-on-save flicker — both lists reload on every save.

### Restoring success path closes the pane but provides no toast/confirmation
- **Where**: `src/ui/version-history/version-history-pane.tsx:316-319`; `src/ui/version-history/restore-confirm-dialog.tsx:38-54`
- **User experience**: User clicks Restore, clicks Confirm, sees the dialog disappear, and the pane slides closed. The canvas underneath rebuilds with the restored content. There is no toast, no animation, no banner indicating "Restored version 4 — now editing v9 forked from v4." A user can plausibly think nothing happened, or that they accidentally hit Cancel, especially because the only change on the canvas is whatever delta exists between current and the restore source. The most consequential action in the pane gives the weakest feedback.

### Restore confirm dialog uses the standard primary variant — no destructive styling on a state-changing action
- **Where**: `src/ui/version-history/restore-confirm-dialog.tsx:57-64`; `src/ui/primitives/confirm-dialog.tsx:14-37`
- **User experience**: `ConfirmDialog` supports a `destructive` prop that switches the confirm button to `destructive-solid`. The Restore dialog passes neither `destructive` nor `confirm_variant`, so the confirm button reads as a friendly primary action — the same visual weight as "Save" everywhere else in the app. Compare to delete-frame and delete-session dialogs (presumably destructive-styled) — restore is at minimum *as* consequential and arguably more so because it's irreversible-looking. The user expects state-changing buttons to look like state-changing buttons.

### "No milestones yet" empty state fires whenever the milestone filter hides all rows — misleads the user that nothing exists
- **Where**: `src/ui/version-history/version-tree.tsx:54-59`
- **User experience**: The empty-state branch runs whenever `display_entries.length === 0`, which is true both when the underlying summaries array is empty *and* when the milestone filter has hidden everything. With "Milestones only" active and no milestones saved, the user sees "No milestones yet — save one to mark a meaningful waypoint." But auto-saves with rich content exist; the user just toggled the filter. The message says "no versions" when reality is "no versions match the filter."
- **Details**: Worse, the session-side message is "No session milestones yet." — equally misleading. Solution would require differentiating "no summaries" vs "filter hid them all" but the empty-state has no awareness of the filter.

### Selection state survives pane close+reopen but compare state does not — inconsistent
- **Where**: `src/ui/version-history/version-history-pane.tsx:174-194`
- **User experience**: The pane uses local React state for `selected_version_id`, `compare_state`, and `restore_open`. The "reset" effect only clears them on `route_key` or `active_tab` change. Closing the drawer (which sets `open=false` but keeps the component mounted) preserves selection and even compare state — so reopening the pane in the *same* route lands the user back inside their previous Compare view, or with the previous selection still highlighted. That sounds fine but produces broken behavior:
  - If a save raced during the close (the common case), the rendered rows have refreshed but the stale `selected_version_id` may or may not still exist; the SelectionFooter shows "Selected: v?" until the user re-picks.
  - Closing the pane mid-compare and immediately re-opening it jumps the user back into Compare, often without realizing the pane was closed at all — confusing UX.
- **Details**: The `restore_open` state isn't cleared on pane close either; if a user opens the dialog, closes the pane via Escape, and re-opens, the dialog reappears immediately.

### Restore can fire against a `selected_summary` that no longer exists in current summaries
- **Where**: `src/ui/version-history/version-history-pane.tsx:196, 308-321`
- **User experience**: `selected_summary` is derived as `props.summaries.find(... === selected_version_id)`. If summaries reload (via `useVersionSummaries`'s reset-on-save flow), the previous row may not exist in the new array, but `selected_version_id` state is unchanged. `selected_summary` becomes null and the Restore dialog conditional renders false — but if the timing flips the other way, the user can still see a stale selection. There's no programmatic safeguard that the version id is still valid before issuing `restoreVersion`.

### Compare view's repository load isn't cached — re-entering Compare re-fetches both versions
- **Where**: `src/ui/version-history/compare-view.tsx:273-298`
- **User experience**: Unlike `useVersionFullLoad` (which has a module-scoped LRU cache for previews), the Compare view's `useEffect` always issues two fresh `loadFrameVersion` / `loadSessionVersion` calls when mounted, and re-runs on every change to `entity_kind`, `from_id`, `to_id`, or `repository`. A user who opens Compare, hits Back, then opens it again pays the full latency on both versions every single time. With slow IndexedDB or a network-bound Supabase store, the user sees the "Loading comparison…" placeholder for hundreds of milliseconds even for versions they were viewing seconds ago.

## MEDIUM

### Restore dialog copy hard-codes `v{current_version_number + 1}` — wrong if a peer tab raced
- **Where**: `src/ui/version-history/restore-confirm-dialog.tsx:67`
- **User experience**: The dialog body advertises that "Restoring version N will create a new version (v{X+1})". X+1 is just the local `current_version_number + 1`. If a second tab created v(X+1) in the gap between dialog open and click-confirm, the actual new version number is X+2 — and the user sees the wrong number in the explanatory text. Mostly cosmetic, but for a destructive-feeling action users actually read this copy, and a mismatched promise erodes trust.

### Cross-tab consistency for the summaries list is incomplete
- **Where**: `src/ui/version-history/use-version-summaries.ts:27-58`
- **User experience**: Re-fetch trigger is the local `frame_version?.id` / `session.current_version_id` selector. If a second tab creates v(X+1) but the local tab hasn't yet processed the cross-tab message, the pane shows stale summaries. There's no `BroadcastChannel` listener inside the hook; it relies on the store to update first. The cross-tab listeners may run asynchronously, so the user can sit looking at the pane with v5 marked current even though v6 already exists on disk.

### `useVersionFullLoad` cache is module-scoped (process-global), shared across users, routes, and frames
- **Where**: `src/ui/version-history/use-version-full-load.ts:21-22, 28-36`
- **User experience**: The LRU cache is keyed only by `${kind}:${version_id}`. User A signs out, User B signs in, opens a frame, previews version `v_xyz`. If User A had previewed any version sharing a UUID prefix coincidence (extremely unlikely in practice, but) the cache lookup wouldn't reset. More realistically: switching between two frames or two repositories (test fixtures vs real) and the cache persists across the swap. There's no `Repository` identity in the cache key, and `__resetVersionFullLoadCacheForTests` confirms the cache is process-global and only resettable in tests.

### Version tree row's tooltip on the relative timestamp shows the raw ISO string
- **Where**: `src/ui/version-history/version-tree-row.tsx:106-117`
- **User experience**: Hovering the "3 days ago" label produces a tooltip that reads e.g. `2026-05-13T15:42:11.038Z` — an ISO 8601 UTC string. A law student wanting to confirm exactly when they made a change has to mentally translate UTC to their local timezone. A formatted local string (e.g. "May 13, 2026, 11:42 AM EDT") would actually answer the question the user came to the tooltip with.

### "session here" pill has no aria-label, no tooltip, no glossary explanation
- **Where**: `src/ui/version-history/version-tree-row.tsx:130-134`
- **User experience**: A non-technical user sees a small mode-accent-colored pill that reads "session here" on one Frame row in the Frames tab. There is no `title`, no tooltip, no explanatory popover, no glossary link. They can guess it means "your current session is anchored to this frame version" but they shouldn't have to. Screen readers also only get "session here" with no context. Combined with the "milestone" concept which isn't explained anywhere either, the pane assumes prior knowledge of the data model.

### Milestone marker — sr-only span contains glyph character, not the words
- **Where**: `src/ui/version-history/version-tree-row.tsx:80-94`
- **User experience**: The visually-hidden span exists for screen readers but contains the literal `★` or `●` character (`marker_glyph`). VoiceOver announces "black star" / "black circle small" depending on Unicode database — not "milestone" or "current version." The intent (improve SR access to the marker meaning) is undone by the implementation. Combined with `aria-hidden="true"` on the wrapper span which then conflicts with the sr-only inner span — the inner span isn't visible *and* its parent is aria-hidden, which most SRs will respect, hiding the sr-only content entirely. The accessibility code is essentially silent.

### `version-tree.tsx` `scrollIntoView` runs only on `current_version_id` change — selection changes don't scroll selected row into view
- **Where**: `src/ui/version-history/version-tree.tsx:42-52`
- **User experience**: When the user selects a row deep below the fold, nothing scrolls; the SelectionFooter updates with "Selected: vN" but the row itself stays off-screen. Then if they navigate using Tab through the rows (each is a button), focus moves but the page doesn't auto-scroll because the rows are inside the `DrawerBody` (which is the scroll container) and reliance is entirely on browser-default Tab scrolling. With dense version trees, users lose track of which row is selected.

### "Compare a Frame version with a Session version" is impossible to attempt but also not advertised
- **Where**: `src/ui/version-history/version-history-pane.tsx:227-235` (compare always uses current entity's current version as `to_id`)
- **User experience**: The Compare button always compares the selected version against the *current* version of the same entity kind. There's no UX for diffing a frame version against a session version. That may be intentional (the diff types are different) but the lack of any UI explanation creates confusion: a user looking at the Frames tab in Argument Running who clicks Compare gets a frame-vs-frame diff, with no hint that they can never compare a Frame version with a Session version. The "Compare to v{N}" button label doesn't help — `N` is always the current frame version, but the user may not realize the comparison stays within entity kind.

### Compare-entry-list expand/collapse exists only for `layout_only` — sections with hundreds of nodes have no collapse
- **Where**: `src/ui/version-history/compare-entry-list.tsx:33, 60-71`
- **User experience**: `expanded` defaults to `true` for every kind except `layout_only`. A frame compare that adds 200 nodes paints 200 rows immediately, scrolling the user's pane indefinitely. There is no per-section collapse for the user to manage long diffs. The "Layout-only changes" section is the *only* one with a collapse affordance — the user can't collapse "Nodes edited" or "Edges added" even when those dominate the diff.

### Compare entry row primary text always uses `whiteSpace: nowrap` + ellipsis — long statements truncate without tooltip
- **Where**: `src/ui/version-history/compare-entry-row.tsx:143-145`
- **User experience**: A premise edit with statement "The Court should reverse because the district court's instruction conflated …" gets truncated at the pane edge, with no tooltip showing the full text. The user has to click into the entity to read what changed. For the "edited" case the user might want to compare the full statements side-by-side, but no view supports that — they have to read the secondary `(fields: a, b)` text and guess what changed.

### Tab switching in `SessionVariant` resets selection but the URL/state shows no visual hint that selection changed
- **Where**: `src/ui/version-history/version-history-pane.tsx:190-194`
- **User experience**: User selects v5 on Sessions tab, switches to Frames tab — selection is reset (which is correct), but if they switch back the previous selection is gone too. There's no "previously selected: v5" memory between tab switches. Users may not realize switching tabs blows away their selection in the original tab.

### Restore dialog has no destructive-disclosure text about deleted/migrated downstream sessions
- **Where**: `src/ui/version-history/restore-confirm-dialog.tsx:66-70`
- **User experience**: For Frame restores, the dialog body talks only about "the current version (vN) and any later versions remain on their own branch." It says nothing about the actual cross-cutting effect: any active session that was anchored against any of those "later versions" is now anchored against a version no longer on the head path. Whether that matters depends on the session-migration logic, but the user can't tell. Restore is one of the most consequential operations in the entire app and the dialog body is two sentences of branching-jargon.

### The Drawer's focus restoration may fire even when the dialog has stolen focus
- **Where**: `src/ui/primitives/drawer.tsx:95-134`; combined with `src/ui/version-history/restore-confirm-dialog.tsx:38-54`
- **User experience**: When the restore confirm dialog opens, the Dialog primitive captures `previousFocusRef` from the activeElement (a button inside the Drawer). When the user confirms, `on_restored` runs, which calls `setRestoreOpen(false)` then `props.onClose()`. The Drawer's cleanup-on-close effect tries to restore focus to `last_focus_before_open_ref` — typically the button that opened the drawer. The Dialog's cleanup tries to restore focus to its previous focus (a button inside the drawer). These race; the user's focus can land on the original toggle button, or get lost. For keyboard users this is a real concern.

### Compare view's "Back to history" button uses `IconButton` with no visible label except the arrow
- **Where**: `src/ui/version-history/compare-view.tsx:315-317`
- **User experience**: Only an `aria-label="Back to history"` and an arrow icon. Sighted users have to know the arrow means "back" — there's no text. For a compact pane this is forgivable, but combined with the lack of breadcrumbs ("Frame versions > Compare v3 to v8") and the fact that the user just toggled into a denser view, the back button is easy to miss. Compare to the explicit "Return to working version" Button in the preview error state (`frame-preview-view.tsx:81-83`) which uses words.

## LOW

### Pane uses inline styles throughout — no shared CSS class for selection/hover/focus states across rows
- **Where**: `src/ui/version-history/version-tree-row.tsx:45-65`
- **User experience**: Most styling is inline `style={...}` with a small `argmap-row-hover` class for hover effect. The selected row's `background: var(--color-surface-selected)` and the current-milestone branch are inline. Focus styling depends on browser default outline; the only mention of focus-visible token use is in `milestone-filter.tsx` (border-radius). Keyboard users may see a hard square focus ring around a row that has rounded corners, depending on the browser.

### `MilestoneFilter` is always rendered even inside Compare view? No — but the filter state is preserved while compare is open
- **Where**: `src/ui/version-history/version-history-pane.tsx:194 (filter reset), 256-292`
- **User experience**: When the user enters Compare, the `MilestoneFilter` is hidden under the conditional `{compare_state ? <CompareView /> : <>...filter...</>}`. Filter state survives. Coming back from compare, filter is whatever it was. That's actually desirable. But filter is reset to "all" on tab change, which is *not* desirable — the user may want milestones-only across both tabs.

### Preview banner uses warning palette but reads more like an info banner — color choice doesn't match meaning everywhere
- **Where**: `src/ui/version-history/preview-banner.tsx:36-39`
- **User experience**: The comment in the file explicitly chose warning palette because the previous gray was missed. But warning yellow can read as "something is wrong" — and the user knows nothing is wrong, they actively chose to preview. The Exit preview button is a secondary in the same yellow context, which inherits no warning meaning, so the visual hierarchy is fine. Subjective; flagging because the choice is documented as deliberate but may surprise.

### Version tree row inline styles set `position: relative` but no visible branch connector
- **Where**: `src/ui/version-history/version-tree-row.tsx:58, 63`
- **User experience**: The "branch indent connector" is just `borderLeft` at `depth > 0`. There's no horizontal stub from the parent to the child, no graphical L-shape, no nesting hint other than padding. For users used to git or filesystem trees this is barebones — branches are hard to follow visually for deeper nesting. The `has_branch_children` / `is_last_child_of_parent` fields are computed but unused.

### Tree row uses `e.stopPropagation`-free `onClick` — clicking inside the Pill toggles select too
- **Where**: `src/ui/version-history/version-tree-row.tsx:43, 130-134`
- **User experience**: The row's `<button>` wraps everything including the `Pill`. If the user clicks the "session here" pill, the entire row is selected. That's not catastrophic but the pill looks like its own UI element (especially as it carries mode-accent color) and the user may expect tapping it to do something pill-specific (e.g., jump to the session). It just acts as click bait for the row.

### "Selected" SelectionFooter label shows "Selected: v?" with a literal `?` when version_number is null
- **Where**: `src/ui/version-history/selection-footer.tsx:54`
- **User experience**: If `selected_version_number` is null but `selected_version_id` is set (race during summaries reload), the footer renders literally `Selected: v?`. The user sees `?`, not a number. Trivial UX nit; mostly indicates a state-consistency edge case isn't gracefully handled.

### Compare entry list expand button label is "Collapse" / "Expand" — no count when collapsed
- **Where**: `src/ui/version-history/compare-entry-list.tsx:69`
- **User experience**: When the layout-only section is collapsed, the user only sees "Layout-only changes (N)" header and can't see entries until they expand. That's fine, but the button text says only "Expand"; "Show N changes" would be more useful, especially given the count is already in the title.

### Preview view uses `height: 100vh` rather than `100dvh` — mobile browsers (iOS Safari URL bar) push content off-screen
- **Where**: `src/ui/version-history/frame-preview-view.tsx:47`; `src/ui/version-history/session-preview-view.tsx:83`
- **User experience**: On iOS Safari the dynamic toolbar adds/removes height; using `vh` instead of `dvh` means the canvas extends beyond the viewport. Users have to scroll inside the preview to see the bottom of their nodes. Mostly a polish issue but affects every mobile user opening a preview.

### `FramePreviewView` falls back to `EMPTY_VERSION` while loading — canvas paints a blank state for a moment
- **Where**: `src/ui/version-history/frame-preview-view.tsx:16-24, 32-42, 86-96`
- **User experience**: While `result.status === "loading"`, the user sees the loading spinner; but `useLayoutResult(loaded_version)` runs against `EMPTY_VERSION` (whose `id: "__empty__"` is consistent). If the layout-computation memoizes by frame_version_id, the system caches a layout for the empty version. The next time the user opens preview for a different version, the layout pass runs again. Not a bug but a wasted compute path.

### Frame preview canvas allows `selection` state but selection cannot affect anything (read-only)
- **Where**: `src/ui/version-history/frame-preview-view.tsx:30, 93-94`
- **User experience**: User can click a node in the preview to select it (the local `selected` state updates), but no panel opens, no editor mounts, no action can be taken. The selection visually exists but has no consequence. A clearer UX would be a noticeable hover with a tooltip "Read-only — exit preview to edit." Currently it looks like the panel could open but doesn't.

### Restore dialog's error path stays open with the error visible — but the loader sets `pending = false` so user can retry the same call indefinitely
- **Where**: `src/ui/version-history/restore-confirm-dialog.tsx:31-54`
- **User experience**: On error, `setError(message)` runs and the dialog stays open with the red error text. The user can press Restore again immediately. If the error was transient (network blip) this is fine; if the error was a permissions / not-found error the user can hammer the button. There's no exponential backoff, no "wait N seconds" hint, no cancel-and-retry separation.

### Preview banner Exit button has no keyboard shortcut binding
- **Where**: `src/ui/version-history/preview-banner.tsx:54-61`
- **User experience**: Escape closes the Drawer but doesn't exit a preview. The preview takes the entire viewport; there's no Escape-to-exit, no keyboard chord. Mouse users click "Exit preview"; keyboard users have to Tab to it. No keyboard escape from a full-screen preview is a small but real accessibility gap.

### `useVersionSummaries` doesn't deduplicate in-flight requests — rapid tab switches issue parallel list queries
- **Where**: `src/ui/version-history/use-version-summaries.ts:34-58`
- **User experience**: Compare to `useVersionFullLoad` which uses an `in_flight` map. The summaries hook does not. Rapidly switching tabs in Session variant (Sessions → Frames → Sessions → Frames) issues parallel `listFrameVersionSummaries` queries that each set state. Last one to resolve wins — for a slow backend the user could briefly see "Loading…" again even after the list has rendered.

### Pane width is hard-coded to `min(520px, 100vw)` — no user resize, no responsive breakpoint
- **Where**: `src/ui/version-history/version-history-pane.tsx:241`
- **User experience**: On a wide 4K monitor the pane is 520px — comfortable but tiny relative to viewport. Long change_summaries truncate. No way to resize. On a small mobile the pane covers the entire screen, which may be intended but leaves no glimpse of the canvas underneath.

### `restoreVersion` doesn't trigger a re-fetch of summaries (the new version is added to the list only because `current_version_id` changes — there's no explicit list refresh)
- **Where**: `src/ui/version-history/use-version-summaries.ts:27-31`
- **User experience**: Because the trigger is the local `current_version_id` selector, restoring (which sets a new `current_version_id`) does invalidate the cache and re-fetch — but only on the actively-displayed tab's entity kind. If the user restored a Frame version while in Argument Running's Frames tab, only `frame_current_id` changes; `session_current_id` stays the same. The Sessions tab won't re-fetch. Cross-entity restores produce stale state on the other tab.

### No type-to-confirm or extra friction on Restore — single click destruction not gated
- **Where**: `src/ui/version-history/restore-confirm-dialog.tsx:38-54`
- **User experience**: Restore creates a new version branch — irreversible. A type-to-confirm pattern (typing "RESTORE" or the version number) would prevent accidental confirms, especially because the dialog opens with the confirm button autofocused (Dialog primitive focuses the first focusable). A user who presses Enter to dismiss a modal could trigger Restore unintentionally if Restore was the last button pressed.

### Pane open/close keyboard: Escape closes Drawer but doesn't reset compare/selection — re-opening jumps back into Compare
- **Where**: `src/ui/primitives/drawer.tsx:80-87`; `src/ui/version-history/version-history-pane.tsx:174-194`
- **User experience**: User opens pane, selects v3, clicks Compare. Compare view loads. User presses Escape. Drawer closes. User opens pane again — they're back inside Compare with the prior v3 → current diff still loaded. Inconsistent with "Escape closes things" mental model — it should arguably also exit Compare mode, or at minimum the next open should land back on the version list.

### Drawer animation is `var(--duration-medium)` slide-in but Compare view's load state replaces the body immediately — UI jolt on first open after compare button click
- **Where**: `src/ui/primitives/drawer.tsx:142, 152-177`; `src/ui/version-history/version-history-pane.tsx:256-265`
- **User experience**: When the user opens the pane mid-Compare (the saved state case from above), the Drawer slides in *with the Compare view already rendered*. If `useEffect` then triggers a fresh load (because cache was cleared or version IDs are new), the user sees the Compare body flash to its loading state mid-slide. Visually jarring.

---

**Tally: 41 findings (3 CRITICAL, 12 HIGH, 16 MEDIUM, 10 LOW)**
