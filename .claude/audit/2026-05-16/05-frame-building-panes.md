# Frame-Building Side Panes & Chrome Audit

Scope: `src/ui/frame-building/` (excluding the canvas itself). Three-pane
layout, left pane (palette + outline), right pane (inspector + options box),
validation drawer, auto-arrange flow, cascade-delete dialog, frame-settings
drawer. Findings from static read; no dev server run.

Severity buckets:

- **P0** — Functional break the user will hit on a normal path; data loss or
  silent failure.
- **P1** — Significant UX defect; confusing affordance, broken accessibility,
  performance smell from architecture.
- **P2** — Polish, copy, edge case.
- **P3** — Latent risk / nit / open question.

---

## P0 — Functional breaks

### 1. Multi-select cascade delete only removes the last node (severe)

`right-pane/inspector.tsx:59-68` (InspectorMulti `on_request_delete_multi`)
iterates the selected ids and calls `on_request_delete(id)` for each, where
`on_request_delete` is `cascade_confirmation.request(node_id)`
(`frame-building-page.tsx:451`). `useCascadeConfirmation.request` in
`ui/hooks/use-cascade-confirmation.ts:25-34` sets `node_id`, `summary`, and
`phase` via `setState`. React batches the N calls in one tick; only the
**last** id's state survives. The user sees one cascade dialog (for the last
id) and confirms — the comment in `inspector.tsx:60-68` claims "one
confirmation per node, in lex order" but that never happens. User
perspective: select 5 nodes, click "Delete 5 nodes and N edges," confirm,
and 4 nodes remain. Looks like the bulk-delete button is fundamentally
broken or like the dialog is double-firing.

### 2. Edge inspector cannot navigate to endpoints

`right-pane/inspector-edge.tsx:13` destructures the navigation prop into
`_on_navigate_to_node` (intentionally unused) and never wires it up. The
header at lines 60-62 shows only the first 8 chars of the source and target
node ids in monospace (`edge.source.slice(0, 8)` → e.g.
`a3f9c0b1 → e7d2a812`). The user has no way to jump from an edge back to
either endpoint. Combined with the fact that node ids are opaque hex, the
edge inspector becomes informationally useless for navigation. Listed as
explicit scope item ("Inspector for edges (V-FR-3): every edge type
editable").

### 3. Selection state survives frame switch (stale node_id)

`frame-building-page.tsx:75` keeps `selection` in page-local React state
and `frame-building-page.tsx:104-106` calls `loadFrame(frame_id)` on
prop change, which swaps `frame_version` to a different frame's nodes.
`selection` is never reset. Result: when the user navigates between two
frames without leaving the route, the right pane will render either
`InspectorNode` with `node_id` from the previous frame (yielding "Node not
found." at `inspector-node.tsx:30`) or `InspectorEdge` with a stale edge
id, until the user clicks something. The same is true for the
`auto_arrange_open`, `settings_panel_open`, `help_pane_open`,
`validation_drawer_open`, `edge_popup`, `switch_to_argument_notice_open`,
and `mode_change_dialog` flags — none reset on `frame_id` change.

### 4. Outline shift-select is dead code

`left-pane/outline-tree.tsx:190-192` invokes
`handleSelect(outline_node.node_id, { shiftKey: false } as React.MouseEvent)`
unconditionally. `handleSelect` branches on `e.shiftKey` to build
multi-selection (lines 76-97), but `shiftKey` is hardcoded false at the
call site, so every outline click is a single-select. The
`OutlineTreeRow.on_select` prop is `() => void` (no event arg), so the
real shiftKey is discarded before reaching this point. User perspective:
"shift-click in outline to multi-select" doesn't work; canvas multi-select
must be used instead.

### 5. Outline tree state never resyncs with frame switch

`left-pane/outline-tree.tsx:45-54` seeds `expanded` (a `Set<string>`) once
via `React.useState`. If the user opens two different frames in the same
session, `expanded` keeps the previous frame's node ids and **does not**
pick up the new frame's `initially_collapsed` hints. Combined with finding
#3, the outline can render with the previous frame's expansion state
applied to nonexistent ids until the user manually toggles each row.

### 6. Frame-default policy editor mutates shared `inputs` map on switch

`right-pane/options-box-editor.tsx:68` `active_policy` resolves to
`frame_default ?? effective` when `edit_mode === "frame_default"`. When
`frame_default` is undefined, `ConditionList.on_change` callbacks called via
this branch dispatch `default_policy_edited` patches for the **library
default** values (because that's what `effective` falls back to). The user
sees no "this is a library default; click to fork" affordance — the first
edit silently creates a frame-level override. Not destructive, but
non-obvious; the source chip still reads "library-default" the moment
before the click.

### 7. `InspectorValidationBlock` and `ValidationDrawer` subscribe to the
whole store

`right-pane/inspector-validation-block.tsx:16` calls
`useFrameStore((s) => s)` and
`validation-drawer/validation-drawer.tsx:18` does the same. The
page-level file explicitly documents avoiding this anti-pattern
(`frame-building-page.tsx:58-62`): "discrete-field subscriptions avoid
the whole-snapshot subscription that caused every page-level patch
(drag, edit, validation change) to re-render the entire frame-building
tree." These two components reintroduce the same problem at the
inspector and drawer level — every keystroke in the inspector and every
canvas drag re-renders the validation block and drawer. With 50+ nodes
and many validation rules this is a measurable perf hit.

---

## P1 — UX defects

### 8. Three-pane layout: no resize, no min-widths, no mobile fallback

`three-pane-layout.tsx:19-22` hardcodes `left_width = "256px"`,
`right_width = "360px"` with no resize handle, no min-width clamp on the
center, and no `@media` breakpoints. At a narrow viewport (≤ ~900 px), the
center pane (the canvas) can be squeezed below ~280 px, making node
manipulation nearly impossible. The aside elements have `overflow: auto`
but the layout never collapses or stacks. The task brief asked for
"resize behavior, min widths, scroll handling per pane, mobile fallback" —
all four are absent.

### 9. No save indicator or debounce feedback anywhere

The right-pane editors and frame-settings sections all use uncontrolled
inputs with `defaultValue` + `onBlur`-dispatched patches (e.g.
`inspector-node.tsx:88-96`, every file in
`right-pane/editors/`). There is no visible "saved" or "saving" indicator
in the TopBar or panes. The user has no feedback that their edits hit
storage. `error-boundary.tsx:66` says "Your work is auto-saved," but no
UI surface confirms it succeeded; if the save fails (Supabase down,
quota exceeded), the user sees no error. The task brief listed "Save
indicator visibility, debounce feedback" — both absent.

### 10. Edit-on-blur loses uncommitted text on rapid action

Because every editor in `right-pane/editors/` (and `inspector-node.tsx`,
`inspector-edge.tsx`) commits only on `onBlur`, an action that does
**not** cause a blur loses the in-flight edit. Examples:

- User types in the question textarea, then clicks the "Auto-arrange"
  toolbar button — auto-arrange dispatches `presentation_hints_reset_all`
  without touching the inspector, but the React tree doesn't re-render the
  textarea (it's uncontrolled, keyed on node_id), so the user's text **is**
  still in the DOM. Then the user clicks Delete — the patch fires before
  the textarea blurs, so the unsaved text is lost.
- Browser tab close: same.
- Switching the selection by canvas click: triggers `key={selection.node_id}`
  remount (`inspector.tsx:42-49`) which destroys the textarea **before**
  blur fires. `defaultValue` plus remount = silently dropped edit. This
  pattern is documented at `inspector.tsx:40-44` as protection from "the
  previous node's text appears in the new node's textarea," but the
  trade-off (losing edits on quick reselection) is undocumented.

### 11. Notes textarea claims Cmd+Enter saves but Escape "cancels"
inconsistently

`right-pane/inspector-node.tsx:97-112` implements Cmd/Ctrl+Enter as
explicit save (blur fires onBlur and patches) and Esc as cancel (resets
the value to last committed and blurs without dispatching). This is
correct in isolation, but the other editors (root-question, sub-question,
checkpoint question, conclusion statement, etc.) do **not** implement Esc-
to-cancel — they only have `onBlur`. A user who learns "Esc cancels in
Notes" will discover Esc commits in every other field. Inconsistent
keyboard contract.

### 12. Empty title silently no-ops in metadata section

`frame-settings/metadata-section.tsx:24-28`: `commitTitle` returns early
if the trimmed value is empty. The user types "Untitled Frame", selects
all, types whitespace, blurs — no error, no rejection, no revert; the
field shows whatever spaces the user typed but the committed title is
unchanged. The same behavior in description and tags (lines 30-44) at
least makes intuitive sense (empty description is allowed), but the
**title** rejection is silent. A toast or inline error explaining "Title
cannot be empty" is missing.

### 13. `linked_to` chip displays raw node id

`right-pane/editors/term-editor.tsx:84-85` renders `<span>{node.linked_to}
</span>` directly — `linked_to` is a NodeRef (UUID string). The user sees
"a3f9c0b1-…" instead of the target node's text or type. Same issue:

- `checkpoint-editor.tsx:119-120` — `opt.target_node_id` rendered as the
  chip text.
- `inspector-edge.tsx:60-62` — edge source/target rendered as 8-char
  truncated hex.
- `logical-gate-editor.tsx:59` — `value` (a NodeRef) rendered raw inside
  the chip via `CHIP_STYLE`.

All four lack a node-id → primary-text resolution step.

### 14. Outline tree is non-virtualized

`left-pane/outline-tree.tsx:181-196` flattens the tree (lines 58-63) and
renders every row. With a 200-node frame this is 200 DOM nodes plus
ResizeObserver, hover-class observers, and selection rings. Combined
with finding #5 (no resync on switch) this becomes the slowest piece of
the left pane at scale. The canvas is virtualized; this is not.

### 15. Outline tree row keyboard focus management

`left-pane/outline-tree.tsx:99-140` handles ArrowUp/Down/Home/End/Left/Right
on the parent tree element, but **never** auto-focuses the `tabIndex=0`
row programmatically when the user navigates with arrow keys. The
`focused_id` state moves, but the corresponding DOM element doesn't gain
focus unless the user manually tabs back in. This breaks the WAI-ARIA tree
keyboard pattern. A screen reader user navigating with arrow keys would
hear the row announced but not see focus shift.

### 16. `condition-picker.tsx` trigger ref via `querySelector("button")`

`right-pane/condition-picker.tsx:85-88` sets `trigger_ref.current` by
`el?.querySelector("button")` against a wrapping `<span>`. If the `Button`
primitive ever wraps its native `<button>` in another element (loading
spinner, icon wrapper), the trigger ref will silently be null and the
Escape-key focus-restore handler (lines 65-68) will no-op. Fragile.

### 17. Condition picker popup doesn't follow scroll

`right-pane/condition-picker.tsx:103-106` positions the popup with
`position: absolute; top: 100%; left: 0`. The right pane has `overflow:
auto` (`inspector.tsx:30`). If the user opens the picker near the bottom
of the pane and the pane scrolls, the popup scrolls with the pane (it's
not portaled) — but if the entire viewport scrolls (e.g. a modal opens
above), the popup may end up off-screen with no constraint.

### 18. Cascade summary tree shows node UUIDs, not labels

`cascade-delete-dialog/cascade-summary-tree.tsx:51-69` lists each
`node_id` in monospace as the chip text and shows `reasonLabel` which
includes `reason.cause_node_id` raw (line 11). For "the following nodes
will be permanently removed," the user reads a list of hex strings with
no preview of what each node *says*. This is the dialog the user is
expected to confirm; making it human-readable is a UX requirement, not
polish. Task brief: "Cascade-delete dialog: list of children, confirm
copy, irreversibility messaging." The messaging is good ("permanently
removed"); the *list* is not.

### 19. Auto-arrange has no failure or undo path

`auto-arrange/auto-arrange-flow.tsx:13-16` dispatches
`presentation_hints_reset_all` and closes the dialog. There is no toast,
no undo button, no rollback. If ELK then fails to produce a layout (the
canvas does surface a banner per `frame-building-page.tsx:410-429`), the
user has no path back to their previous positions short of manual
re-arrangement of every node. Task brief: "Auto-arrange: button feedback,
what if ELK fails, undo support."

### 20. Validation drawer error rows look dismissible but aren't

`validation-drawer/validation-row.tsx:68-88` renders the dismiss /
restore IconButtons only when `result.severity === "warning"`. Errors
get neither. But error rows are styled identically to warnings (same
padding, opacity, hover behavior) — the user may hover an error row
looking for a dismiss × and find nothing. No "errors cannot be dismissed"
hint anywhere. Combined with `data-testid="validation-restore-all"`
being warnings-only, the error-handling contract is invisible.

### 21. No-frame fallback in inspector / outline differs

`right-pane/inspector.tsx:36-37` shows `InspectorEmpty` when
`!frame_version` OR selection is empty. `InspectorEmpty` itself renders
"No frame loaded." via `InlineEmpty` if `frame` is null. Meanwhile
`outline-tree.tsx:142-153` returns its own "No frame loaded." block.
Two different no-frame states render in different panes simultaneously
with the same copy but inconsistent styling. A single Loading or No-Frame
state across the page would be cleaner.

### 22. Disabled palette item `title` is a fragile a11y hint

`left-pane/palette-item.tsx:33-37`: the `<button>` is rendered with
`disabled={true}` for the duplicate-RootQuestion case, and the
`disabled_reason` is passed as the `title` attribute. Disabled buttons
in some browser/AT combos suppress pointer events entirely (so the
native tooltip on hover may not fire). Combined with the fact that
disabled buttons aren't focusable in tab order, the user has no
discoverable way to find out *why* the Root Question tile is greyed out.

### 23. Drag from disabled palette item has no visual rejection

`left-pane/palette-item.tsx:36`: `draggable={!disabled}`. Native HTML
drag is disabled, which is correct, but if the user attempts to drag
anyway, they get **no feedback at all** — no cursor change, no shake, no
toast. The `cursor: not-allowed` (line 50) hints at it but only after
the user happens to hover. A pulse or toast saying "A frame can have
only one Root Question" on drag attempt would be friendlier.

### 24. `frame-settings-panel.tsx` "Done" button is just close, but reads as save

`frame-settings/frame-settings-panel.tsx:86-88`: the footer renders
`<Button variant="secondary" data-testid="frame-settings-done"
onClick={on_close}>Done</Button>`. Because every section in the drawer
commits on blur / change, "Done" is functionally identical to clicking
the × in the header — it just closes the drawer. But the label "Done"
strongly implies "save these changes." A user who edits a field, blurs,
then clicks Done feels like they confirmed; a user who edits, then
clicks the × may worry they cancelled. Inconsistent expectation.

### 25. Mode change button shows internal jargon to users

`frame-settings/mode-flavor-section.tsx:27`: when
`on_open_mode_change_dialog` is undefined, the "Change mode" / "Change
flavor" buttons render `title="Coming in I.9d"` — an internal release-
plan identifier exposed to the user. If a user hovers in a build where
the prop isn't wired, they see jargon.

### 26. `is_loading` state shows generic LoadingScreen with no error
distinction

`frame-building-page.tsx:302-304`: any `is_loading === true` returns
`<LoadingScreen label="Loading frame…" />`. If the frame load fails the
store sets `error` and `is_loading` to false; the user then sees the
"No frame loaded" `CanvasEmptyState` with the error message. But if a
load is in-flight and slow (e.g. 10 s), the user just stares at the
spinner with no cancel, no retry, no timeout. Task brief: "Loading:
while frame is loading after navigation, what's shown."

### 27. Empty-frame hint is canvas-only; outline says different thing

The canvas-overlaid hint at `frame-building-page.tsx:362-407` says "Start
with a Root Question — Drag the tile from the palette on the left..."
The outline tree empty state at `outline-tree.tsx:158-172` says "Outline
appears here once nodes exist. Add a Root Question from the palette
above." The wording is slightly different and the spatial reference
("on the left" vs "above") refers to different panels. The right-pane
empty-state at `inspector-empty.tsx:33` says "Select a node on the
canvas to edit it here." Three panes, three different first-time copy
treatments.

---

## P2 — Polish, copy, edge cases

### 28. No tab order between panes / no skip-to-pane keyboard shortcut

The three panes share a `display: grid` but no programmatic focus
management; the user must tab through every left-pane palette item,
every outline row, the entire canvas, then into the right pane.
Standard IDE-style editors expose `Ctrl+1/2/3` to jump panes. Task
brief: "Keyboard shortcuts: tab order between panes, escape to
deselect, undo/redo (if present)." No undo, no pane-jump, no escape
deselect anywhere.

### 29. No escape-to-deselect on canvas/page level

`frame-building-page.tsx` has no global escape handler. The user
expects Esc to clear selection (closing the inspector to empty state)
but Esc only works inside individual textareas (where it cancels the
edit). Task brief explicit: "escape to deselect."

### 30. No drag-and-drop outline reorder, no right-click context menus

Task brief explicit: "Drag-and-drop tree reorder (if implemented),
Right-click context menus (if implemented)." Neither implemented; the
outline tree is read-only beyond expand/collapse.

### 31. AI attribution chip has no override / undo

`right-pane/field-attribution-decoration.tsx:13-32` renders the
`AiAttributionChip` next to the label when the field was AI-edited.
There is no affordance to dismiss or override the chip; if the user
then manually edits the field, the chip persists until a new hook
record overwrites it. The chip's logic at
`use-field-attribution.ts:10-17` walks backwards through invocations
looking for `accepted` or `edited` decisions — a user manual edit is
not tracked, so the chip stays. User perspective: "I changed this
text myself but it still says AI-generated."

### 32. Conclusion tag input adds whitespace tags silently

`right-pane/editors/conclusion-editor.tsx:76-82`: `addTag` trims the
input but does not check for duplicates. If a tag exists with the
same trimmed value, it's added twice. Also, if the user pastes
"a,b,c" expecting CSV behavior, they get one tag literally named
"a,b,c."

### 33. Authority editor `binding_in` chip shows no remove

`right-pane/editors/authority-editor.tsx:159-164` renders chips for
each binding jurisdiction but provides no × to remove a single one
— the user must use `on_pick_binding_in_jurisdiction` to add, but
there is no symmetric removal affordance. The other chip patterns
(`term-editor.tsx:89-106`, `conclusion-editor.tsx:158-181`) do
expose a remove ×.

### 34. Frame settings sections don't acknowledge they're auto-committed

`metadata-section.tsx:24-44` commits on blur. The user has no visual
cue that blurring is the save action. A subtle "Saved" toast or
checkmark on each section would help, especially for the description
textarea where the commit fires only on Cmd+Enter or blur but not on
the Enter key (so a long description with line breaks must be
committed via Cmd+Enter or by clicking elsewhere).

### 35. Term editor "Order" accepts any number with no validation feedback

`right-pane/editors/term-editor.tsx:50-59`: `<input type="number">`
with `min={0}` and an `onBlur` that parses `parseInt` and silently
no-ops on NaN. The user typing "-1" can submit and the value is
ignored without telling them. Numeric `min` HTML constraint doesn't
fire on blur — only on form submission.

### 36. Burden-level dropdown legal-only field shows raw enum names

`right-pane/condition-row.tsx:81-86`: `{l.replace(/_/g, " ")}` — turns
`beyond_reasonable_doubt` into "beyond reasonable doubt." Acceptable
machine translation, but Title Case ("Beyond Reasonable Doubt") would
match how the checkpoint editor labels them
(`checkpoint-editor.tsx:42-48`). Inconsistent capitalization between
two condition rows that show the same data.

### 37. Frame jurisdiction default has no US territories

`frame-settings/jurisdiction-section.tsx:5-56`: `US_STATES` list omits
DC, Puerto Rico, Guam, etc. Selecting "Territory" goes to a free-text
field at lines 152-170 with no validation. For a legal-mode product
serving a US-focused user, DC and PR are common omissions to flag.

### 38. `outline-tree-shape.ts` cycle protection silently truncates

`outline-tree-shape.ts:146-166`: `visited` set prevents re-walking. If
the frame contains a cycle (e.g., `DECOMPOSES_INTO` loop), the outline
silently truncates the second visit with no indicator. Validation
should already catch the cycle but if it doesn't, the user sees an
incomplete outline with no hint.

### 39. Validation drawer doesn't filter by node type or severity

`validation-drawer/validation-drawer.tsx:23-47`: errors and warnings
shown in two flat lists. No filter chips, no group-by-node, no
"show only this node's issues" toggle. With a frame producing 30+
issues, the drawer becomes a wall of text.

### 40. Outline + canvas selection bidirectional sync edge case

`outline-tree.tsx:65` derives `selected_id` from
`selection.kind === "node" ? selection.node_id : null`. When the
canvas selection is `multi` (multi-node), the outline shows zero
selection. The reverse (outline single-select while canvas shows
multi) is also possible. The "selection" model conflates outline
single-select with canvas single-select but they should reflect each
other — or there should be a deliberate "outline shows what's focused,
not selected" distinction. Neither is in evidence; the outline just
goes blank during canvas multi-select.

---

## P3 — Latent risks / nits

### 41. `pin-archive-delete-section.tsx` deletes a frame then navigates

`pin-archive-delete-section.tsx:60-66`: `handleDelete` calls
`deleteFrame` and then `navigate({ kind: "home" })`. The drawer
remains mounted under the parent page during the await; if
`deleteFrame` fails, the dialog closes but the page is still loaded
on a now-deleted frame id. No error surface, no toast.

### 42. Edge editor doesn't show source/target node *type* either

`right-pane/inspector-edge.tsx` and `editors/edge-editor.tsx` show
the edge type and label but nothing about the endpoint types
(RootQuestion → SubQuestion, etc.). Knowing that a `DECOMPOSES_INTO`
edge connects a RootQuestion to a SubQuestion is the most useful
context when editing.

### 43. `condition-list.tsx` AnyOf group has at most one — UI doesn't say

`right-pane/condition-list.tsx:38-41` and lines 96-117: AnyOf is
treated as a single group; the picker's "+ Add any-of group" item
only renders when `show_any_of = !has_any_of`. A user who reads the
description "Adds a disjunctive group (at most one per policy)"
might still expect a second group is possible after deletion. The
picker's hide-after-add is correct but the description should also
explain the single-group limit upfront.

### 44. `conclusion-editor.tsx` direction state can be incoherent on mode switch

`right-pane/editors/conclusion-editor.tsx:84-85`: `currentDirectionValue`
falls back differently depending on `mode`. If a frame switches from
legal to general (or vice versa) — handled elsewhere via the mode-change
dialog — an existing Conclusion's `direction.kind === "legal"` value
would still render in the general-mode select as a missing option.
No coercion logic protects the editor.

### 45. `field-attribution-decoration.tsx` chip is unlabeled

`right-pane/field-attribution-decoration.tsx:28`: the
`<AiAttributionChip>` is rendered without an `aria-label`. Screen
readers may read "image" or nothing depending on its implementation;
the field label and the chip together are not announced as related.

### 46. `OutlineTreeRow` chevron click bubbles risk

`left-pane/outline-tree-row.tsx:44-47`: `handleChevronClick` calls
`e.stopPropagation()` so the row click doesn't also fire. Good. But
the chevron `<span>` has `aria-hidden="true"` (line 105) and is **not**
focusable, so keyboard users get expand via Space on the row (line 53)
— that's the intended pattern. Just note that mouse and keyboard users
have asymmetric paths: mouse can click chevron-only (no select) or
row-only (select); keyboard cannot expand without first selecting via
Enter/click. Document this UX choice or add Space-to-expand-only via
ArrowRight.

### 47. `OutlineTree` has no virtualization (re-mention from #14)

Already in P1 #14 but worth noting again for backlog: any frame > 50
nodes will render slowly on outline open. Add to perf followup queue.

### 48. No read-only mode treatment anywhere in the frame-building UI

Task brief explicit: "Read-only mode visual treatment for all of the
above." Nothing in the panes, drawer, dialogs, or settings handles a
read-only signal. If a user opens a frame they don't have edit rights
on (shared via auth in the future), every textarea will still appear
editable; every `applyPatch` will fire and fail at the store/repo
layer rather than be visually disabled. No `pointer-events: none`
overlay, no chip indicating "read-only."

### 49. No undo/redo

Task brief explicit. The frame store appears patch-based
(`applyPatch({...})`) which is a foundation for undo, but no UI is
wired. A user accidentally clicking "Auto-arrange" (which clears all
positions) has no Undo button; same for deleting a node.

### 50. Concurrent edit safety in OutlineTree + Inspector

If the user has the outline open and selects a node, then the
inspector opens. From the inspector the user clicks Delete → cascade
confirmation → confirm. The outline tree row is removed in the next
render. But `OutlineTree`'s `expanded` state still holds the deleted
id (memory leak, not crash). Over a long session, `expanded` grows
unboundedly. Same for `focused_id`.

---

## Cross-cutting observations

- **No telemetry / event hooks** in any side-pane interaction — no
  way to see which palette items the user clicks most, where
  validation issues cluster, or whether cascade-delete confirmations
  are completed vs cancelled. The product's iteration loop will be
  flying blind on UX signal.
- **Style sprawl**: Every component computes its own inline `style`
  object with `var(--*)` tokens. No shared form-section style;
  reads like the codebase is in transition from inline-styled
  components toward CSS modules / a design system. Touching any
  layout-level spacing requires editing many files.
- **No length limits** on any text field (`maxLength` not found in
  the directory). A user pasting a 100 KB block of text into the
  Root Question statement textarea will silently dispatch a patch
  with the full payload to storage. No truncation, no warning.
- **The options-box directory is empty** (`options-box/`). The
  options-box editor lives at `right-pane/options-box-editor.tsx`.
  The empty top-level directory is either stale scaffolding from a
  planned move or a discoverability landmine. Either remove or
  populate.

---

## Tally

Total findings: **50**

- **P0**: 7 (multi-select cascade clobber, edge inspector navigation
  missing, stale selection on frame switch, dead shift-select in
  outline, outline expansion state never resyncs, default-policy
  silent fork from library default, whole-store subscriptions in
  validation block & drawer)
- **P1**: 20 (no resize/min-widths/mobile, no save indicator, blur-only
  edit losses, inconsistent Esc behavior, silent empty-title reject,
  raw IDs in chips, no virtualization, missing focus follow-through,
  fragile trigger ref, popup positioning, raw IDs in cascade list,
  no auto-arrange undo/fail, error rows look dismissible, three
  inconsistent empty states, fragile disabled-button tooltip, no
  drag-reject feedback, "Done" misleading, internal jargon leak,
  generic loading screen, mismatched first-time copy)
- **P2**: 13 (no pane tab order/shortcut, no Esc-to-deselect, no DnD
  reorder or context menus, AI chip override missing, duplicate/
  whitespace tags, missing remove × on binding_in chips, no save-
  acknowledgement, Order field silent reject, dropdown case
  inconsistency, missing US territories, cycle silent truncation,
  no drawer filtering, outline blanks on canvas multi-select)
- **P3**: 10 (delete-then-navigate race, edge editor lacks endpoint
  types, AnyOf single-group hint, mode switch leaves stale direction,
  AiAttributionChip aria, chevron-keyboard asymmetry, outline perf
  re-mention, no read-only mode treatment, no undo/redo, OutlineTree
  expanded/focused leak on delete)
