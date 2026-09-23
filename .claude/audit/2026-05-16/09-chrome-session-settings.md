# Audit: Top-bar chrome and Session Settings panel

Scope: persistent header on Frame Building and Argument Running pages, plus the
Session Settings drawer launched from Argument Running.

Severity scale: **critical** (block work, data loss) / **high** (wrong label,
broken affordance, accessibility regression) / **medium** (usability rough edge,
copy issue, missing feedback) / **low** (polish, cosmetic).

---

## Top-bar chrome

### 1. "Frame settings" button in Argument Running actually opens Session Settings — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:84`
The chrome renders `<FrameSettingsButton onOpen={deps.on_open_session_settings} />`.
`FrameSettingsButton` (`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/frame-settings-button.tsx:12`)
hard-codes `aria-label="Frame settings"` and an `IconButton` whose `title`
defaults to that aria label. On the Argument Running page the gear icon thus
reads "Frame settings" to sighted users and to screen readers but the click
opens the **session** settings drawer. A real frame-settings entry point exists
only via the G12 in-body link (which itself navigates away — see #28 below).
From the user's perspective the chrome's settings gear lies about what it does.

### 2. Validation indicator never appears in Argument Running — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:77`
The slots object hard-codes `indicators: null`. `ValidationIndicator`
(`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/validation-indicator.tsx:11-25`)
has a `surface="argument_running"` branch that reads from
`compute_result?.validation_results`, but no caller mounts it. The user running
an argument has no chrome-level surface for compute-side validation; any
warnings/errors produced at run-time live only inside the page body.

### 3. Operating-mode toggle in Argument Running never blocks/warns — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:38-44`
`OperatingModeToggle` is mounted with `validation={[]}` and no
`onSwitchToArgument`/`onSwitchWithWarnings`/`onValidationBlocked` handlers. The
toggle's guard logic for entering Argument with errors/warnings
(`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/operating-mode-toggle.tsx:34-49`)
only fires on switches *into* `argument_running`. Going from Argument back to
Frame is unguarded by design, but this also means the user can lose unsaved
session-side state (selected item, in-flight edit) without any prompt.

### 4. Mode/flavor chip's "click to open settings" affordance is unwired — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/mode-flavor-chip.tsx:8,20,31`
`ModeFlavorChip` accepts an `onOpenSettings` prop and styles the inner span as
clickable (`cursor: pointer`, conditional `title="Open frame settings"`,
`onClick={onOpenSettings}`). Neither call site provides it:
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-building-page.tsx:282`
and `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:72`
both omit the prop. The chip therefore reads as static for users who notice
the styling difference, and any user who tries clicking it sees nothing happen.

### 5. Operating-mode toggle moves selection on arrow keys — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/segmented-toggle.tsx:29-43`
`handleKeyDown` calls `onChange(options[next].value)` immediately when the user
presses Arrow Left/Right/Up/Down to focus the next segment. ARIA Authoring
Practices for radio groups expect roving focus *without* commit. Inside the
operating-mode toggle this means a single arrow keypress while the toggle has
focus triggers a real mode switch — which can pop the warning dialog
(`operating-mode-toggle.tsx:42-44`) or the validation toast
(`frame-building-page.tsx:268-278`) on what the user thought was a navigation
gesture.

### 6. Sign-out has no confirmation; flush failure is silently swallowed — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/sign-out-button.tsx:19-30`
A single click invokes `autosave.flushAll()` followed by `signOut()`. The
try/catch wraps only the flush; on failure the catch is empty and sign-out
proceeds anyway, then the per-user repository unmounts. From the user's
perspective there is no warning that pending edits might not have made it to
the server and no confirmation prompt before sign-out. For a law student
working on hours-long argument analysis, a stray click on the chrome icon ends
the session unconditionally.

### 7. Empty-title commit in chrome FrameTitle is silently rejected — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/frame-title.tsx:22-29`
`commit()` only applies the patch when `draft.trim()` is truthy; otherwise it
exits edit mode and discards the draft without a toast, banner, or visual
revert animation. The user clears the title, blurs, the field jumps back to
the prior value, no explanation. By contrast `SessionTitleEditor`
(`/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:100-110`)
at least resets the draft so a re-edit starts clean — these two siblings
behave differently for the same empty-input case.

### 8. Frame-title input has no max length, no counter, paste is single-line — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/frame-title.tsx:41-63`
The `<input>` has no `maxLength`. Pasting a paragraph with newlines is silently
flattened by the native single-line `<input>` (browsers strip `\n`). For a
power user who pastes a question stem from a brief, the textual loss is
invisible. The session-title editor in the top-bar slots
(`top-bar-slots.tsx:120-144`) has the same shape and same omissions.

### 9. Frame title is `<h1>` but session title is `<span>` — **medium**
Files: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/frame-title.tsx:71`
and `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/top-bar-slots.tsx:147-163`
In Argument Running both render side-by-side, so the page has an `<h1>` for the
parent frame title (rendered `read_only`) and a `<span>` for the session title
that is actually the page's subject. Screen-reader users navigating by heading
jump to the frame, not the session they're in. Inconsistent heading semantics.

### 10. Sign-out aria-label/title falls back to "signed in" / "user" — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/sign-out-button.tsx:17-18`
When `user.email` is nullish (oauth provider with no email scope, etc.) the
label reads `Sign out (signed in)` and the tooltip reads `Signed in as user —
click to sign out`. Reasonable fallback strings, but the `user` literal is jarring.

### 11. Home button skips unsaved-changes prompt — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/home-button.tsx:11`
`onClick={onClick}` fires unconditionally. Both call sites
(`frame-building-page.tsx:261` and `top-bar-slots.tsx:37`) wire it directly to
`navigate({ kind: "home" })` with no in-flight-edit guard. Same data-loss risk
as #6, lower threshold (single icon click in the top-left of the chrome).

### 12. Validation indicator merges severities into one count word — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/validation-indicator.tsx:36-39`
The displayed label uses `count` (total) plus the worst-severity word: `2
errors` for 2 errors, `5 issues` for 1 error + 4 warnings, `4 warnings` for 0
errors + 4 warnings. A frame with 1 error and 4 warnings reads "5 issues",
hiding the fact that only one of them blocks. The user can't tell error count
from warning count without opening the drawer.

### 13. Validation indicator's clickable area looks like a status decoration — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/validation-indicator.tsx:48-71`
`<button>` with `background: transparent`, `border: var(--border-thin) solid
transparent`, and a tiny icon + label. The hover state changes background only.
Compared to the IconButton siblings to its right, the indicator does not read
as actionable; users may not realize clicking it opens/closes the drawer.

### 14. Warning-confirmation dialog uses neutral copy + non-destructive button — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/operating-mode-toggle.tsx:59-72`
"Continue" with default `primary` confirm variant on a dialog whose body says
"ungated paths may produce incomplete results". The user is committing to a
mode that may compute partial answers; a heavier treatment (e.g., destructive
variant or explicit "Switch anyway") would better match the consequence.

### 15. Chrome breakpoints stop collapsing below 560px — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/styles/global.css:208-222`
Chips hide at ≤720px, indicators at ≤560px, but home + mode toggle + title +
five chrome buttons (version history, settings, help, sign-out) plus chips/
indicators if visible remain a single horizontal flex row at any width. On a
phone-sized viewport the title will be the only flexible element, and the
title plus the static buttons will overflow horizontally with no scroll
container. The header has `overflow: visible` (default).

### 16. Top-bar has no scroll shadow / no separator state — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/top-bar.tsx:33`
The hairline border is static. When the underlying page scrolls, the chrome
reads flat against the scrolled content; modern apps (Linear/Notion) add a
subtle shadow when content scrolls under the sticky bar. Not a defect, just a
polish gap.

### 17. Mode flavor chip omits jurisdiction in Legal mode — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/mode-flavor-chip.tsx:16-17`
In legal mode the chip shows only `"Legal"`. Practitioner workflow check
(Article III § 2): jurisdiction is the single most-needed cue when reading or
arguing a legal frame. The pill has space (`secondary` slot already exists for
general mode) but the legal branch doesn't populate it from `frame.jurisdiction`.

### 18. Mode-flavor chip uppercases its content with no visible chevron — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/mode-flavor-chip.tsx:22-32`
`textTransform: uppercase` with letter-spacing, conditionally rendered with
`cursor: pointer` — but no chevron, no underline, no hover state changes
beyond what `Pill` provides. Even when `onOpenSettings` is wired, the affordance
to click is invisible.

### 19. Help glossary pane has no search/filter — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:36-58`
~25 glossary entries from `GLOSSARY_DICTIONARY`
(`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/glossary-tooltip.tsx:11`)
are listed in full with no filter input. Finding "Foreclosure" or "Active set"
requires scrolling the whole list.

### 20. Help glossary's legal entries hide when no frame is loaded — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:14-21,60`
`is_legal` is derived from `frame?.mode === "legal"`. When a user opens Help on
the Home page or before a frame finishes loading, `frame` is null and the
"Legal Concepts" section never renders. A user reading Help to *decide* whether
to start a frame in legal mode is denied the legal definitions they would use
to make that decision.

### 21. OnboardingPreferencesSection is mounted inside Help & Glossary — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:90`
`OnboardingPreferencesSection` (Reset Coachmarks) lives at the bottom of the
glossary pane (`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-preferences-section.tsx:6`).
A non-coder user reading Help looking for the definition of "Burden of Proof"
will not expect to find a destructive-ish state-reset action below the
glossary. Discoverability is bad and location is surprising.

### 22. Help button label vs. pane title — copy mismatch — **low**
Files: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-button.tsx:12`
("Help and glossary") vs `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:26`
("Help & Glossary"). Ampersand vs spelled-out conjunction. Trivial but visible
to screen-reader users who hear one label and see another header.

### 23. Help glossary pane is not curated for context — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:36-58`
All non-legal entries render regardless of which page the user is on. On the
Frame Building page, terms like "Premise" and "Primary path" (Argument-running
concepts) appear; on the Argument Running page, terms like "Logical Gate" and
"Term" appear without surrounding context. No per-surface filtering.

### 24. Drawer focus-trap autofocuses the close button — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/drawer.tsx:102-106`
`focusables` includes everything in DOM order. The DrawerHeader contains the
close `<IconButton>` (`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:27`
and `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/session-settings-panel.tsx:27`)
which therefore wins the autofocus race. Opening either drawer with the
keyboard lands focus on Close — pressing Enter immediately re-closes it.

### 25. Drawer has no backdrop scrim and no click-outside-to-dismiss — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/drawer.tsx:185-201`
There is no semi-transparent backdrop and no click-out handler. Two drawers
(`HelpGlossaryPane` and `SessionSettingsPanel`) can be opened concurrently,
both at `side="right"`, both at the same `Z.drawer = 80` band. They will
visually overlap; the most-recently-mounted wins. Users have no global
"dismiss the side panel" affordance other than Escape (which dismisses both)
or finding the X within each.

### 26. Sticky chrome over backdrop-blur breaks on long pages without contrast — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/top-bar.tsx:40-44`
`backdropFilter: saturate(120%) blur(2px)` plus
`background: var(--color-surface-elevated)` — when the underlying canvas
contains high-contrast nodes, the blur effectively becomes the only separation
between chrome and content. Combined with #16 (no scroll shadow), the chrome
boundary can disappear during canvas pan/zoom.

---

## Session Settings panel

### 27. MetadataSection commits empty title — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/metadata-section.tsx:17-22`
`commitTitle()` only checks `draft_title !== title`; it does not trim or
require non-empty. A user who selects all + deletes + tabs out persists `""`
as the session title. The chrome `FrameTitle` (#7) at least no-ops; the
session-settings title commits the empty string. Inconsistent with the chrome
title editor, with the SessionTitleEditor in `top-bar-slots.tsx:100-110`, and
with what a user would expect from a "session title" field.

### 28. G12 "frame settings" link does not open frame settings — **high**
Files: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g12-advisory-toggle-section.tsx:58-71`
and `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:236-239`
The G12 section copy reads "Set per-frame in frame settings." with "frame
settings" styled as a colored button. The wiring closes the session-settings
panel and calls `navigate({ kind: "frame_building", frame_id })`. The user
lands on the Frame Building page with the frame settings drawer **closed**.
The link's promise (open frame settings) is not kept; the user must locate
and click the gear icon themselves once they arrive on the other page.

### 29. Type-to-confirm delete is case- and whitespace-sensitive — **high**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/archive-delete-section.tsx:24,68,87-93`
`if (confirm_text !== title) return;` with no `.trim()`/`.toLowerCase()` on
either side. A title with leading/trailing whitespace becomes
nearly impossible to type back exactly. Copy on
`archive-delete-section.tsx:102` ("Type the title exactly to enable Delete")
mentions "exactly" but not case-sensitivity. From the user's perspective the
button is mysteriously dim.

### 30. Delete dialog title interpolates an unbounded session title — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/archive-delete-section.tsx:68`
`title={`Delete session "${title}"?`}` with no truncation. A long session
title (the auto-generated `Argument session — ${frame.title}` from
`frame-building-page.tsx:237` can be hundreds of characters if the frame title
is) overflows the dialog header.

### 31. "Archive" tooltip helps; "Delete" has no tooltip — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/archive-delete-section.tsx:48-65`
The Archive button carries an explanatory `title` attribute ("Archived
sessions are hidden from the default open-existing-session list"). The Delete
button has no `title`; the user gets only the button label.

### 32. Deleting the current session navigates away with no toast/confirmation — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/argument-running-page.tsx:240-247`
`on_delete_session` awaits `app_state_store.deleteSession` then navigates
back to Frame Building (or Home). No toast acknowledges "Session deleted." If
the delete fails, the awaited promise rejects and the navigation skips, but
the panel was already closed at `argument-running-page.tsx:241` so the user
sees the form vanish, nothing happens, and the page is unchanged with no
explanation. The error case is handled by *nothing*.

### 33. Archive toggle has no progress / no toast — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/archive-delete-section.tsx:17-21,48-56`
`toggleArchive` dispatches the patch and returns synchronously. The button
label flips between "Archive" and "Unarchive" on next render, but if the
in-flight session is being viewed in another tab the user gets no signal that
the archive happened in the database. Combined with #32 — no feedback for
either of the two state-mutation actions in this section.

### 34. G6 empty-state copy points at a button the user may not see — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g6-remove-rewrite-section.tsx:38-48`
"Use the 'Rewrite' button in the prose tab of the output viewer to generate
one." References UI surfaces (prose tab, output viewer) by name without
linking to them. If the user closes the session-settings panel and looks at
the page, they have to figure out which pane and which tab the prose lives in
on their own.

### 35. G6 confirm-body copy uses implementation jargon — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g6-remove-rewrite-section.tsx:79-82`
"This creates a new session version (v{N}). The canonical deterministic output
is unchanged." For a non-coder, "session version", "canonical", and
"deterministic" are technical. The dialog could simply say "Remove the
rewritten prose. The original answer stays the same. You can rewrite again
later." (No-fix audit; only flagging.)

### 36. G12 section terminology is opaque to law-student users — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g12-advisory-toggle-section.tsx:41`
"Cross-implication advisories" with no inline gloss. The pill shows
Enabled/Disabled, and the help link sends the user away (#28). A user opening
the panel for the first time has no way to learn what the feature is *without*
leaving the panel.

### 37. G12 pill mode-accent colors don't read as on/off — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/g12-advisory-toggle-section.tsx:42-47`
Enabled → success green pill; Disabled → secondary-text-on-status-open-bg.
The Disabled state's "status_open_bg" token reuses the open status background
and the secondary-text color, which is a low-contrast neutral. The pill looks
half-finished rather than off.

### 38. Session-settings panel has no read-only / preview gating — **medium**
Files: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/session-settings-panel.tsx`
The panel renders unconditionally when `open === true`. Subsections accept no
`read_only` prop. When a session is being previewed from version-history (or
any read-only surface), nothing prevents the user from editing metadata,
toggling archive, or hitting Delete. The chrome's `FrameTitle` accepts
`read_only`; session settings does not.

### 39. MetadataSection draft state silently overrides external updates — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/metadata-section.tsx:13-15`
`React.useEffect(() => setDraftTitle(title), [title]);` runs every time the
store-side `title` changes. If tab A is editing the title with an uncommitted
draft and tab B writes a new title via Supabase realtime, the effect overwrites
the draft. The user's in-flight input is silently destroyed. Cross-tab
consistency: not handled; last-write-wins from the store.

### 40. MetadataSection has no maxLength, no character count, no Save button — **medium**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/metadata-section.tsx:79-94,104-121`
Commit-on-blur is the only signal. Users habituated to a Save button get no
acknowledgement that their edit persisted. The description `<textarea>`
accepts arbitrary length. The title `<input>` accepts arbitrary length.

### 41. Session-settings Done button duplicates the Close X — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/session-settings-panel.tsx:44-48`
Both invoke `on_close`. Two visual ways to do the same thing with no semantic
difference (the section commits are inline-on-blur, not gated by Done). For
users coming from form-based products, "Done" implies save-and-close — here it
just closes; the saves happened on blur earlier.

### 42. Archived banner uses warning colors regardless of severity — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/session-settings/metadata-section.tsx:42-60`
The archived banner uses `--color-background-warning` and
`--color-text-warning`. Archiving is not an error or warning condition; it's a
state. Yellow-on-yellow reads as caution where calm/neutral would be more
honest.

### 43. Drawer's `inert` for closed-state requires React 19 typings — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/drawer.tsx:193-196`
The comment notes the `{...({ inert: "" } as { inert: string })}` cast. On
older React/TS environments the attribute may not project and the drawer's
closed-state children will be tab-reachable. Worth flagging for QA on whatever
runtime ships.

### 44. Session-settings drawer's footer "Done" is also covered by Escape — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/drawer.tsx:80-87`
Escape is bound at the document level when the drawer is open. With the
session-settings panel open *and* a destructive `ConfirmDialog` (e.g., the
delete confirmation) layered on top, pressing Escape dismisses the dialog —
but the same keystroke may bubble to the drawer's listener depending on order
of registration. Not verified at runtime; worth flagging.

---

## Cross-cutting

### 45. No skip link to session-settings or help drawers — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/styles/global.css:144-167`
The single skip link targets `#main`. Once a drawer is opened, there is no
keyboard shortcut to jump to it; the user must Tab through the chrome to reach
it. For mouseless users this is fatiguing.

### 46. Chrome icon buttons all use same hover crossfade with no semantic distinction — **low**
File: `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/icon-button.tsx:55-105`
Version history, settings, help, and sign-out all share the same ghost
IconButton treatment. Sign-out is the only one that destroys session state
without a confirmation (#6); chrome users have no visual cue that one of these
five buttons is materially more dangerous than the others.

---

Tally: **46 findings** across top-bar chrome, Session Settings, and
cross-cutting concerns. Severity mix: 9 high, 24 medium, 13 low.
