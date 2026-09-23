# Visual Design & Design-System Consistency Audit — argmap

Audit scope: design tokens, primitives, mode-accent cascade, hover/focus states,
animation, dialog/drawer surfaces, custom nodes/edges, and inline-style drift
across pages. The previous polish pass eliminated raw hex literals (verified
clean) and centralized most spacing/typography/radius tokens. The remaining
issues are mostly drift between two paths that achieve the same thing slightly
differently — they will read to a user as "this part of the app feels a beat
off the rest."

Categorized; severity tags are POLISH / MINOR / MEDIUM (no MAJORs in the visual
layer right now).

---

## TOKENS / CASCADE

### 1. Mode-accent cascade has no transition (MEDIUM)

`src/ui/styles/tokens.css:222-236` defines `--color-mode-current-accent` and
its `-bg` variant under `[data-mode="frame-building"]` and
`[data-mode="argument-running"]`. `src/ui/app-routes.tsx:69-74` flips
`document.documentElement.dataset.mode` on route change. There is no
`transition: color/background-color …` declared on the `:root`, `body`, or
elements that consume the accent.

User notices that on switching Frame Building ↔ Argument Running, every
accent surface (focus ring, primary button fill, recommended-next highlight,
primary-path edges, segmented-toggle active pill, scroll-bar accent on input
focus, etc.) flips in a single frame — the page feels like a hard cut between
two unrelated screens rather than a transition between two views of the same
app. Fix direction: declare a slow color transition on the elements that
display the accent, or animate the custom-property value via @property.

### 2. Default mode fallback never resets when no `data-mode` is set (POLISH)

`src/ui/styles/tokens.css:233-236` re-declares the fallback inside the
default `:root` block AFTER the two data-mode blocks. Because `:root` has the
same specificity as `[data-mode="…"]` and later rules win, the fallback wins
over the data-mode rules at the `:root` level. The data-mode rules still
apply because they're being evaluated at element scope (the body sets
`data-mode`), but a reader of `tokens.css` will think the data-mode
specialization is dead.

User notices: no visual symptom on the live app today; this is a maintenance
hazard the next session will trip over when adding a third mode.

### 3. minimap fallback HSL values drift from the tokens they shadow (MINOR)

`src/ui/canvas/minimap.tsx:27-31` provides hardcoded HSL fallbacks for the
status fills it reads via CSS custom properties:
- `--color-status-open` → fallback `hsl(30 6% 70%)`; actual token (tokens.css:32)
  is `hsl(30 6% 45%)` (lightness off by 25%, falls to mid-gray instead of
  dark-gray).
- `--color-status-contested` → fallback `hsl(34 75% 60%)`; actual `hsl(34 75% 44%)`
  (lightness off by 16%, falls to a lighter orange).
- `--color-text-tertiary` → fallback `hsl(30 5% 56%)`; actual `hsl(30 6% 46%)`
  (passes 4.6:1 contrast in token, fallback would fail).
- `--color-border-default` → fallback `hsl(30 8% 80%)` — matches.

User notices: nothing during normal operation (the var resolves). If
`tokens.css` ever fails to load or the minimap mounts in a context that hasn't
inherited the var, the colors will be visibly wrong. Fix direction: replace
the hardcoded fallbacks with the same values declared in `tokens.css` (or
better, throw if the var is empty so the bug surfaces in dev).

### 4. Legacy accent aliases leak directly into editor styles (POLISH)

`tokens.css:99-103` provides aliases `--color-accent`, `--color-primary`,
`--color-primary-subtle`, `--color-text-accent` mapped to the mode-current
accent. `src/ui/frame-building/right-pane/editors/{checkpoint,term,logical-gate,authority}-editor.tsx`
chip styles use `--color-primary-subtle` / `--color-primary`. Same surfaces
in `src/ui/frame-building/right-pane/options-box-editor.tsx:142` use
`--color-accent` for an "Edit instance" pill. Three names for the same value
exist for backward compatibility.

User notices: the chips on every right-pane editor are correctly accent-tinted
today. The drift is conceptual — new callers can pick any of three names; a
reader has to know they're synonyms. Fix direction: pick one canonical name,
codemod the rest, drop the aliases in a follow-up.

### 5. `--font-serif` token defined but used in only one component (POLISH)

`tokens.css:127` declares `--font-serif: "Source Serif 4", Georgia, …, serif`.
Only `src/ui/argument-running/output-viewer/prose-tab.tsx:115,177` consume
it. Every other narrative surface — dialog body copy, drawer body, glossary
tooltip definitions, validation messages, frame description text — uses the
default sans font.

User notices: the Prose tab in argument-running reads as visibly different
from the rest of the app. Either an underused token (legal/general copy
should be serif elsewhere too) or content that should be serif is silently
sans. Probably worth deciding whether Source Serif 4 is for prose generally
or for the Prose tab specifically.

---

## COLOR / TONE

### 6. Pill primitive and `.argmap-pill` CSS class disagree on the foreclosed tone (MEDIUM)

`src/ui/primitives/pill.tsx:53-56` maps `status_foreclosed` to color
`--color-status-foreclosed` (a near-neutral hsl(30 8% 32%)). The
class-driven path in `src/ui/styles/global.css:1078-1082` sets
`[data-tone="foreclosed"]` to `--color-status-foreclosed-accent` (a reddish
hsl(355 38% 42%)). Same conceptual variant, two different colors depending
on whether the consumer uses `<Pill variant="status_foreclosed">` or
`<span className="argmap-pill" data-tone="foreclosed">`.

User notices: foreclosed nodes/items rendered through the Pill component
look greyish; ones using the class form look red. Side-by-side this would
be obviously wrong. Fix direction: pick the accent color (more semantic for
"this got cut off") and update the JS primitive to match.

### 7. StatusBadge reimplements the binding/persuasive subflag chip (MEDIUM)

`src/ui/primitives/status-badge.tsx:188-213` builds the subflag chip
(`<span>` + UIcon + "B"/"P" letter) inline with a custom padding (`1px
var(--space-1)`), font-size `--font-size-2xs`, letter-spacing wide, line-height
1, custom background/color tokens. `src/ui/canvas/nodes/node-renderers.tsx:79-100`
also renders a binding/persuasive chip via `<Pill size="xs" bg=… color=…>`,
which renders with different inline styling (padding `1px var(--space-1)`
which matches, but border, letterSpacing, line-height all drawn from Pill's
inline-style block at pill.tsx:107-127). And `global.css:1102-1119` defines
`.argmap-pill[data-tone="binding"]` / `[data-tone="persuasive"]` with a
third set of paddings (`2px 8px`) and font-size (`--font-size-2xs` uppercase).

User notices: three visually-similar but not identical binding/persuasive
chips appear on the same screen — node card vs. status badge subflag vs.
class-driven pill. The padding and letter-spacing differ by a pixel or two
in each. Fix direction: route every site through a single
`<Pill variant="subflag_binding">` and delete the inline reimplementations.

### 8. AiAttributionChip uses inline JS hover swap instead of CSS hover (MINOR)

`src/ui/primitives/ai-attribution-chip.tsx:71-76` mutates
`borderColor` via `onMouseEnter` / `onMouseLeave` listeners. The pattern is
out of sync with every other primitive (Button, IconButton, Card, etc.)
which uses CSS `:hover`. Two consequences: (1) no keyboard `:focus-visible`
response — keyboard users navigating through AI-touched fields get no
border change; (2) the inline write fights React's render path.

User notices: the chip's border doesn't bloom on keyboard focus the way
other interactive primitives do — an accessibility-visible gap.

### 9. ValidationIndicator manually swaps background on hover (MINOR)

`src/ui/chrome/validation-indicator.tsx:65-70` uses the same JS hover
pattern as item 8. Same observations: no `:focus-visible` styling, fights
React's render. The "KEEP RAW" comment at line 42 justifies why it's not a
Button, but it doesn't justify why it can't lean on a CSS class for hover.

User notices: keyboard focus shows the default focus-visible halo (via
`.argmap-row-hover:focus-visible`, but only if the class is applied — it
isn't here), so this button reads visibly less polished than an IconButton
sitting next to it in the top bar.

### 10. Edge label background does not contrast over node surfaces (MINOR)

`src/ui/canvas/edges/structural-edge.tsx:54` and `checkpoint-option-edge.tsx:47`
both set the EdgeLabel background to `var(--color-surface-canvas)` —
hsl(36 16% 97%), a warm cream. Nodes render on `--color-surface-elevated`
(pure white). When the bezier path crosses near a node body, the label
"punches through" the node with a subtly-different cream background, which
reads as a rendering artifact.

User notices: edge labels look like they've been pasted on, not drawn on,
when they happen to overlap a node card. Fix direction: use a transparent
background with a subtle blur backdrop, or match the node's
`--color-surface-elevated`.

---

## TYPOGRAPHY / SCALE

### 11. DialogHeader and DrawerHeader use different heading sizes (MEDIUM)

`src/ui/primitives/dialog.tsx:50` sets DialogHeader to `--font-size-lg`
(17px). `src/ui/primitives/drawer.tsx:25` sets DrawerHeader to
`--font-size-md` (15px). Both are "the title of an overlay surface" — a
conceptual peer. The DialogHeader comment at lines 47-49 acknowledges the
heading-tier convention but the Drawer header silently breaks it.

User notices: opening the Help & Glossary drawer right next to having
just dismissed a Confirm dialog, the drawer title reads visibly smaller and
the user reads it as "lower priority" even though both are top-level
container titles. Fix direction: align Drawer to `--font-size-lg`, or
intentionally codify "drawers are quieter than dialogs" by also bumping the
DialogBody / DrawerBody copy sizes consistently.

### 12. ConditionRow input override is 11px in a 13px world (POLISH)

`src/ui/frame-building/right-pane/condition-row.tsx:119-122` defines
`INPUT_STYLE` with `fontSize: var(--font-size-xs)` (11px) and `padding: 2px
var(--space-1)`. This overrides the `.argmap-input` baseline of 12px (and
the iOS-pointer-coarse bump to 16px) globally for any condition row's
selects/inputs.

User notices: typing in a burden_met select reads markedly smaller than
typing in any other inspector input. The user may not notice it directly,
but reads the compactness as "this is auxiliary metadata" even when burden
selection is structurally important.

### 13. Recompute indicator falls back to literal pixel size (POLISH)

`src/ui/argument-running/interview-pane/recompute-indicator.tsx:18-19`
hardcodes `width: 8, height: 8`. Same with the AI sparkle dot in the
class-driven CSS at `global.css:1158-1169` (8x8 unitless). The spacing
scale starts at 4px (`--space-1`); 8px is `--space-2`.

User notices: dots are correctly sized today; this is drift from "every
dimension comes from a token."

### 14. SessionTitleEditor input fixed width 240px breaks at narrow widths (MINOR)

`src/ui/argument-running/top-bar-slots.tsx:141` sets `width: "240px"`
on the in-place title input. On narrow viewports the input doesn't shrink
with the available space.

User notices: at smaller widths the title input runs into the chips and
indicators region of the top bar.

---

## SPACING / DIMENSIONS

### 15. Drawer width default uses a fixed 360px, no min(360px, 100vw) (MINOR)

`src/ui/primitives/drawer.tsx:71` defaults `width = "360px"`. Compare
`src/ui/chrome/help-glossary-pane.tsx:24` which explicitly uses
`width="min(360px, 100vw)"` — the more careful pattern. The default would
overshoot the viewport on very narrow phones.

User notices: on a 320px-wide phone, an unmodified Drawer fills 360px and
clips the right edge. The HelpGlossaryPane has the workaround but every
other Drawer consumer relies on the 360 default.

### 16. TwoPaneLayout collapsed-row height hardcodes `"32px"` instead of using the token (POLISH)

`src/ui/argument-running/two-pane-layout.tsx:22` hardcodes `"32px"` for
the collapsed bottom-panel row, but `tokens.css:213` defines
`--height-row-toolbar: 32px` specifically for this surface. The
`bottom-panel.tsx:29,71` correctly uses `var(--height-row-toolbar)`. So the
layout and its child agree on the value but the layout doesn't read from
the token.

User notices: today both equal 32px so no visual issue, but a change to the
toolbar token won't propagate to the grid track. Reader of the layout will
wonder why the magic number.

### 17. ThreePaneLayout left/right widths declared inline default (POLISH)

`src/ui/frame-building/three-pane-layout.tsx:19-21` defaults
`left_width = "256px"`, `right_width = "360px"`, `bottom_height = "220px"`.
None are token-backed. `two-pane-layout.tsx:17-18` uses `left_width =
"280px"`. The two layouts have similar roles (left pane width should
arguably be the same).

User notices: left pane in Frame Building is 256px wide; left pane in
Argument Running is 280px wide. Switching between them, the eye reads a
24px shift in the left edge of the center pane.

### 18. Validation indicator height 26px outside the button height scale (POLISH)

`src/ui/chrome/validation-indicator.tsx:52` sets `height: "26px"`, which
matches the sm-Button height (`global.css:386`). The value is duplicated
rather than referenced. The Frame Version drift indicator
(`src/ui/argument-running/frame-version-drift-indicator.tsx:36`) uses
padding-only sizing, so the resulting heights between sibling "status
pills" in the top bar differ.

User notices: in the argument-running top bar, the validation indicator
(when shown) and the drift indicator sit side-by-side with slightly
different heights (24-ish vs 26px). The eye reads the row as not-baseline-
aligned.

### 19. Custom node Conclusion + Interpretation use literal 3px borders (POLISH)

`src/ui/canvas/nodes/node-frame.tsx:60-61` declares the Conclusion
double-border via `0 0 0 3px var(--color-surface-canvas), 0 0 0 calc(3px +
var(--border-thick)) …`. The two `3px`s aren't tied to a token. Same file
line 45 — `borderLeft: "3px solid var(--color-edge-structural)"` on
Interpretation. Tokens.css declares `--border-thin/-medium/-thick = 1/1.5/2`
but no `--border-emphasis/-double-gap` at 3px.

User notices: nothing today, but the conclusion ring's gap is fragile
under future border-token tweaks.

### 20. FrameSummaryCard hardcodes `minHeight: "44px"` header — only file in the codebase using 44px touch-target convention (POLISH)

`src/ui/home/frame-summary-card.tsx:97` is the only place enforcing
the WCAG 44x44 touch target. Every IconButton sm default is 26x26 (well
under 44), and ConditionRow icon-buttons are sm too.

User notices: on touch devices, every icon-button (the X to remove a
condition, the trash on a tag, the times in the toast, etc.) is below the
recommended touch-target size. The mobile experience reads as cramped.

---

## COMPONENT / PRIMITIVE USAGE

### 21. Toast dismiss button is a raw `<button>` around `<UIcon name="times" />` instead of `<IconButton>` (MINOR)

`src/ui/primitives/toast.tsx:187-209` renders its dismiss control as a
raw button with manually-styled padding/border/font-size. The child is
`<UIcon name="times" size={14} />` — exactly the case IconButton's
`SOLID_ALIAS: { times: "cross" }` was built for (lines 34-36 of
icon-button.tsx). Toast would get the outline→solid cross-fade for free.

User notices: every other "close X" in the app (HelpGlossaryPane drawer
header, condition-row remove, tag remove) has the gorgeous outline-to-solid
hover bloom. The toast close X just sits there static.

### 22. Several raw `<button>` instances reimplement pill-toggle (POLISH)

Files using a hand-rolled toggle chip:
- `src/ui/argument-running/interview-pane/interview-filter.tsx:71-103` — node-type, jurisdiction, reason filters
- `src/ui/version-history/milestone-filter.tsx:25-87` — "All" / "Milestones only"
- `src/ui/frame-building/frame-settings/pin-archive-delete-section.tsx:80,88` — Pin/Archive toggles
- `src/ui/frame-building/right-pane/options-box-editor.tsx:136-153` — instance/frame-default toggle

Each maintains its own active/inactive color logic. Five different paint
patterns; some use `--color-mode-current-accent`, some use `--color-accent`,
some use `--color-background-accent`. All are commented "KEEP RAW: …".

User notices: filter pills look one way in argument-running, another way
in version-history, a third way in frame settings. The user reads each pane
as a slightly different app. Fix direction: most are pill-shaped binary
toggles; a `<PillToggle>` primitive would unify them.

### 23. ConfirmDialog `confirm_variant` and `destructive` props are redundant and inconsistent (POLISH)

`src/ui/primitives/confirm-dialog.tsx:13-37` accepts both `destructive`
(boolean) and `confirm_variant` (`"primary" | "danger"`). Lines 28, 37
combine them via OR, so `destructive=true` or `confirm_variant="danger"`
both upgrade the button to `destructive-solid`. The doc comment at line 14
says `destructive` is "Same as `confirm_variant="danger"` plus subtle copy
hints" but no copy hints actually fire — the dialog body is just children.

User notices: at the API level the two flags mean the same thing today. A
reader implementing a new confirm has to pick one and it's not obvious
which. Fix direction: drop `destructive`, keep `confirm_variant`.

### 24. ModeFlavorChip wraps onClick in a span with unconditional `cursor: pointer` (MINOR)

`src/ui/chrome/mode-flavor-chip.tsx:26` sets `cursor: onOpenSettings ?
"pointer" : "default"` correctly. But line 19's outer Pill is given
`title={onOpenSettings ? "Open frame settings" : undefined}` — so the
hover affordance (cursor and tooltip) only fires on chips that have a
handler. So far so good. But the chip is rendered without `role="button"`
or any aria binding to `onOpenSettings` — keyboard users have no way to
trigger settings from the chip.

User notices: hovering a chip in the top bar shows a pointer cursor and a
"Open frame settings" tooltip, but Tab-and-Enter doesn't open settings.

### 25. CanvasToolbar separator is a hardcoded 1×18 span with inline color (POLISH)

`src/ui/canvas/canvas-toolbar.tsx:89-97` renders a vertical divider
as `<span style={{ width: 1, height: 18, background:
"var(--color-border-subtle)" }} />`. The `width` and `height` are literal,
unscaled; `height: 18` doesn't match any spacing token (closest are
`--space-4 = 16` and `--space-5 = 24`).

User notices: nothing breaks; this is the kind of magic-number sprinkled
in just before ship that piles up over time.

### 26. Spinner is rendered in 4 different sizes across the app (POLISH)

LoadingScreen uses Spinner size 20 (`src/ui/primitives/loading-screen.tsx:32`),
InlineLoading uses 14 (line 194), output-view-tabs uses 12 (line 85), home
ghost tutorial button uses 12 (`home-page.tsx:225,265`), frame-summary-card
uses 12 (line 176). Five values: 12, 14, 20, 22 (Spinner default).

User notices: Spinners in different async contexts look slightly different.
Fix direction: standardize to sm/md/lg explicit sizes (e.g., 12/16/22) via
a size enum rather than free-form numbers.

---

## MOTION / TRANSITIONS

### 27. SegmentedToggle transitions use `--duration-slow` (350ms) — way slower than the rest of the app (MEDIUM)

`src/ui/primitives/segmented-toggle.tsx:88-89` declares
`"background-color var(--duration-slow) var(--ease-standard), color
var(--duration-slow) var(--ease-standard)"`. The Button family uses
`--duration-fast` (100ms), IconButton uses 220ms, almost everything else
uses `--duration-fast` or `--duration-base` (150ms).

User notices: clicking the operating-mode toggle (Frame ↔ Argument) lags
visibly — the new pill takes 350ms to settle while the page itself is
already rendering the new layout. The control reads as sluggish.

### 28. Selection-shadow on node is composed only when `display.selected` (POLISH)

`src/ui/canvas/nodes/node-frame.tsx:124-126` builds `selectionShadow`
as a one-shot string; it doesn't transition in/out. Other selection
treatments (Inspector outline via `:focus-visible`, segmented toggle) use
the `.argmap-card:focus-visible` shadow with the global transitions. The
canvas node selection snaps.

User notices: clicking a node, the accent halo pops onto the card instantly
while everything else in the app uses a 150ms fade. Reads as inconsistent
selection model between canvas and the rest of the app.

### 29. Tooltip has fade-in but no fade-out (POLISH)

`src/ui/primitives/tooltip.tsx:138` applies
`argmap-overlay-fade-in` on appear. On `handleMouseLeave` the tooltip
unmounts (`setOpen(false)`), so it disappears in one frame — no
`argmap-overlay-fade-out`. The Dialog primitive does the three-phase
mount/exit (dialog.tsx:113-134); Tooltip skipped it.

User notices: tooltips fade in gracefully but pop out abruptly. The
asymmetry reads as a small jank.

### 30. `pointerEvents: "none"` on tooltip prevents text selection of definitions (POLISH)

`src/ui/primitives/tooltip.tsx:137` sets `pointerEvents: "none"`. For
the glossary tooltip (`src/ui/primitives/glossary-tooltip.tsx`), which
shows multi-sentence legal definitions, this means the user can't select
or copy the definition text.

User notices: the law-student user trying to copy a glossary term's
definition out of a tooltip into notes can't. They have to open the
Help & Glossary drawer first.

### 31. CanvasMinimap reads CSS vars only once at mount (POLISH)

`src/ui/canvas/minimap.tsx:21-46` memoizes `statusFill`, `defaultFill`,
`strokeColor`, `maskColor` with `[]` deps. The comment at line 24-25
acknowledges this would go stale on theme switch.

User notices: the in-progress mode-accent cascade (item 1) would not flow
into the minimap mask color even if we added the transition, because the
minimap snapshots colors at mount.

### 32. Status-badge pop animation re-fires only when React keys change (MINOR)

`src/ui/primitives/status-badge.tsx:128-130` keys the badge by `s`
(the status string). When status changes from open → satisfied, the badge
remounts and `argmap-status-pop` plays. But when the failed_conditions
array changes (e.g., a new failed condition added under "open"), the badge
does NOT remount because `s` is still "open" — and the user gets no visual
nudge that the badge's tooltip content changed.

User notices: editing a checkpoint and seeing a new failed-condition reason
appear in the badge tooltip without any cue that "something changed here"
on the badge itself.

---

## STATES / INTERACTION

### 33. Focus-visible halo only triggers for elements with specific classes (MEDIUM)

`src/ui/styles/global.css:333-345` enumerates the elements that get the
3-px accent-bg halo: `argmap-card`, `argmap-btn`, `argmap-icon-btn`,
`argmap-radio-card`, `argmap-output-tab`, `argmap-row-hover`,
`argmap-segmented-tab`, `argmap-outline-row`. Every other focusable element
(inputs use `.argmap-input` focus styles, others fall to `:focus-visible`
outline). But chips like ModeFlavorChip, filter buttons in
interview-filter, validation indicator, drift indicator, recompute
indicator dot, etc. — none get the halo.

User notices: keyboard-tab through the top bar and the focus ring style
visibly changes between elements (sometimes accent-bg halo via class,
sometimes generic 1.5px outline via the global `:focus-visible` rule,
sometimes nothing because the element is unstyled-on-focus). Looks
inconsistent.

### 34. Disabled state for IconButton is opacity-only (POLISH)

`src/ui/styles/global.css:769-772` sets `.argmap-icon-btn:disabled {
opacity: 0.4; cursor: not-allowed }`. Compare `.argmap-btn:disabled` at
line 380-383 which sets `opacity: 0.45`. Two opacity values for the same
conceptual disabled state. Also `.argmap-input:disabled` (line 577-584)
adds a background tint per the comment "Opacity alone makes white-on-white
indistinguishable". IconButton has no background tint when disabled.

User notices: a disabled IconButton in a toolbar reads as washed-out but
still card-shaped — different from a disabled solid button (which is more
visibly "off") and different from a disabled input.

### 35. EmptyState icon has hardcoded opacity 0.7 (POLISH)

`src/ui/primitives/loading-screen.tsx:101-104` wraps the empty-state
icon in `color: var(--color-text-tertiary); opacity: 0.7`. The tertiary
color was already darkened in the audit comment at tokens.css:15-17 to
pass 4.6:1 — multiplying by 0.7 likely sends it back under AA.

User notices: empty-state icons (e.g., the document icon on home page
empty state) read as fadeout-faint rather than just secondary-quiet.

### 36. Multiple "X to close" patterns across the app (POLISH)

Close affordances I found:
- HelpGlossaryPane → IconButton with `<UIcon name="times" />` size 14 (drawer.tsx flow)
- Toast → raw button with `<UIcon name="times" />` size 14
- ConclusionEditor tag remove → raw button with `<UIcon name="times" />` size 12
- TermEditor linked-to clear → raw button with literal "×" character (line 105)
- ConditionRow → IconButton with `<UIcon name="times" />` size 14

Five close-X patterns, three implementations: IconButton (good),
raw-button-with-UIcon, raw-button-with-literal-character.

User notices: same intent ("dismiss / clear / remove"), three different
visual treatments. The literal "×" in term-editor in particular doesn't
match the UIcon family.

### 37. Mode-flavor chip dot separator is just visually-decorative `·` with no role (POLISH)

`src/ui/chrome/mode-flavor-chip.tsx:36-44` renders the separator as a
`<span aria-hidden>·</span>` with `marginInline: "1px"`. The 1px is a
literal. Compare the global pattern of `--space-1 = 4px` minimum.

User notices: the mid-dot is so tight to its neighbors that it reads as
part of the words rather than a separator. "Legal · Personal" looks like
"Legal·Personal".

### 38. CheckpointOptionEdge label has different border than its parent edge (POLISH)

`src/ui/canvas/edges/checkpoint-option-edge.tsx:50-52` styles the edge
label with `border-thin solid var(--color-mode-current-accent)` when
on-path, `border-hairline solid var(--color-border-subtle)` when off-path.
The transition between on-path and off-path changes border weight from
0.5px to 1px — visible jump in size, not just color.

User notices: when an interpretation choice flips the primary path, the
labels along the new path snap to a thicker border at the same time the
stroke recolors. The two transitions are not coordinated.

### 39. Connector handle background is `--color-mode-current-accent` with no transition (POLISH)

`src/ui/canvas/connector-handle.tsx:75-86` and node-frame.tsx
`handleSourceStyle` (line 387) both render the connector handle in the
mode accent. Connector-handle has no transition; node-frame's handle has a
`transition: opacity var(--duration-fast) …` but no transition on the
background color itself.

User notices: when switching between modes, every connector handle pops
to the new accent in one frame — same root cause as item 1.

### 40. Tutorial tour buttonNext uses literal 14px padding (POLISH)

`src/ui/tutorial/tutorial-tour.tsx:160` styles joyride's next button
with `padding: "var(--space-1) 14px"`. The 14px is a literal that maps to
neither a `--space-N` token nor the Button family's padding (10/12/16 by
size in `global.css:387,394,403`).

User notices: tour buttons read at a slightly off size compared to a
real Button in a dialog. The user is in tour mode so it's not load-bearing
but it's drift.

---

## MISC

### 41. Operating-mode toggle defines `--duration-slow` use AND key navigation calls onChange immediately (POLISH)

`src/ui/primitives/segmented-toggle.tsx:30-36` on arrow-key, calls
`onChange(options[next].value)` immediately — for the operating-mode
toggle, this means arrow-keying through the toggle triggers the full
mode-switch flow including ConfirmDialog for warnings. The user arrowing
to discover the labels accidentally triggers the warning dialog.

User notices: a keyboard user landing on the toggle and pressing → to
read the next label gets a warning modal. Roving radiogroup pattern in
ARIA does NOT specify that arrow changes the value — it changes focus,
and selection happens on Enter/Space.

### 42. Inspector tag-pill (ConclusionEditor) has no max-width / wrap behavior (POLISH)

`src/ui/frame-building/right-pane/editors/conclusion-editor.tsx:19-28`
PILL_STYLE has `whiteSpace` undefined and no max-width. A long tag pushes
the row width arbitrarily wide.

User notices: a user pasting a long phrase as a tag breaks the inspector
layout.

### 43. SignOutButton not surfaced in this audit because it's a wrapper — but I see no "destructive" affordance on sign-out (POLISH)

The destructive variants apply to delete actions. Sign-out is destructive
(user loses local context) but is rendered as ghost? Worth confirming. Not
a bug, just an information-architecture question.

### 44. Top-bar progressive collapse hides chips/indicators but not buttons (MINOR)

`src/ui/styles/global.css:213-222` hides `.argmap-topbar-chips` at
720px and `.argmap-topbar-indicators` at 560px. But `.argmap-topbar-buttons`
(four IconButtons + SignOutButton, ~5 × 30px + gaps = ~170px) never
collapses. At very narrow widths the buttons can still push the title to
clip.

User notices: at 380px the top bar shows home, mode toggle, truncated
title, and the full button cluster; the title gets ellipsed before the
buttons compress.

### 45. The `.argmap-output-tab` underline-tab pattern is unique to the output viewer (POLISH)

Used only by `output-view-tabs.tsx`. Comment in that file at lines 1-12
correctly explains "view switchers use underline + role=tab; filter use
pill + role=radio" — but nothing else in the app uses underline tabs.
Single-use primitive in `global.css:917-942`. Fine for now, worth noting
in case a second tabbed surface ever appears (e.g., suggestion-drawer
might need similar tabs).

### 46. Inert state on closed Drawer doesn't visually distinguish from open Drawer mid-animation (POLISH)

`src/ui/primitives/drawer.tsx:194-196` adds `inert=""` when closed. The
drawer animates off-screen via transform. Mid-animation the drawer is
visually-present but `inert` — clicking it doesn't fire handlers. No
visual cue (e.g., opacity decrease) that the drawer is becoming
non-interactive.

User notices: clicking on a closing drawer that's mid-animation does
nothing, with no visible reason.

### 47. Output-view-tabs computing-state spinner re-uses Spinner size 12 (POLISH)

`src/ui/argument-running/output-viewer/output-view-tabs.tsx:84` —
Spinner size 12 next to text at font-size-sm (12px). The two visual sizes
match perfectly; this is good. But the `gap: "var(--space-2)"` (8px)
between them is wider than any tab's internal padding (2-3 of `--space-2`
to `--space-3`) — the "Computing…" affordance sits a beat off the tab
strip.

---

## SUMMARY

47 findings spanning tokens, color, typography, spacing, components,
motion, and states.

Highest leverage to fix first:
- #1: mode-accent transition (affects entire app's mode-switch perception)
- #6: Pill foreclosed-tone drift between primitive and class (semantic ambiguity)
- #11: Dialog vs Drawer header sizes
- #27: SegmentedToggle 350ms transition (operating-mode toggle lag)
- #33: Focus-visible halo coverage (a11y polish)
- #7: StatusBadge subflag reimplementation (three places to maintain)

The audit confirms the Wave A polish removed nearly all raw hex literals
(none found) and centralized most spacing/typography. What remains is
drift between two paths that achieve almost the same thing — the kind
of cleanup that compounds over the next few sessions.
