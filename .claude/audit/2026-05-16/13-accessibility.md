# Accessibility Audit — argmap (frontend)

Scope: keyboard nav, focus management, screen-reader support, ARIA semantics, reduced motion, color contrast, live regions, animations, drag/drop a11y, dialog/drawer behavior, tab/tablist patterns, print stylesheet.

Severity scale: CRITICAL (blocks AT user) → HIGH (significant barrier) → MEDIUM (friction) → LOW (minor) → POLISH (nit).

A note on positives the audit confirmed (so they don't appear as gaps): `sign-in-screen.tsx` uses correct `autoComplete` (`email`, `current-password`, `new-password`) and `useId`-linked `<label htmlFor>`; `loading-screen.tsx` Spinner exposes `role="status"` and the reduced-motion-aware `argmap-spinner-pulse` fallback; `tokens.css:273-282` zeroes the duration scale under `prefers-reduced-motion: reduce`; `global.css:1225-1234` adds a catch-all transition/animation collapse; `outline-tree.tsx` implements the WAI-ARIA tree pattern with arrow-key navigation.

---

## CRITICAL

### 1. Skip-to-main link does not move focus (WCAG 2.4.1)
`src/ui/app-routes.tsx:119-131`. The skip-link is a plain `<a href="#main">` with no `onClick` handler, and the target is `<main id="main" tabIndex={-1} style={{ display: "contents" }}>`. Activating the anchor only updates `location.hash`; it does NOT call `mainEl.focus()`. Result: keyboard users press Tab → see the skip link → press Enter → URL gets `#main` but focus remains on the (now off-screen) anchor, so the next Tab returns into the top-bar chrome and the bypass is defeated. Compounded by `display: contents` on the `<main>` itself, which several browser/AT combinations (notably some Chromium + screen-reader versions) treat as removing the element from the accessibility tree — the named landmark is effectively missing. User impact: keyboard / SR users cannot bypass the top bar to reach page content on every page load.

### 2. `role="radio"` cards announce as toggle buttons, not radios
`src/ui/onboarding/new-frame-wizard.tsx:240-247` (mode + flavor cards). Each card uses `role="radio"` paired with `aria-pressed={active}`. `aria-pressed` belongs to `role="button"`; radios must use `aria-checked`. Additionally, the surrounding `<div style={{ display: "grid", … }}>` has no `role="radiogroup"` (or `role="group"` with `aria-label`), and there is no arrow-key handler — the only way to change selection is to click each card. NVDA / VoiceOver / JAWS will report "toggle button, pressed/not pressed" instead of "radio button, 1 of 2, selected/not selected", and arrow-key navigation between siblings does not work. The mode/flavor choice in onboarding is the very first interaction a SR user makes — getting this wrong frames the whole product as inaccessible.

### 3. Click-to-edit titles are mouse-only
`src/ui/chrome/frame-title.tsx:70-99`: `<h1 onClick={startEdit}>` with `cursor: "text"` but no `tabIndex`, no `role="button"`, no `onKeyDown`. Same pattern in `src/ui/argument-running/top-bar-slots.tsx:146-163` (`SessionTitleEditor` `<span onClick={() => setEditing(true)}>`) and `src/ui/chrome/mode-flavor-chip.tsx:31` (`<span onClick={onOpenSettings}>`). Keyboard users cannot reach edit mode, cannot rename the frame, cannot rename the session, and cannot open frame settings via the mode chip. Renaming the frame is a primary action; this is a hard block on keyboard users completing core workflows.

### 4. Canvas nodes are completely off-keyboard
`src/ui/canvas/frame-canvas.tsx` + `src/ui/canvas/nodes/node-frame.tsx`. React Flow renders nodes as plain divs with `data-node-id` and `onMouseEnter`/`onMouseLeave` hover handlers; none of the variants in `node-frame.tsx` set `tabIndex`, `role`, or any keyboard interaction. Selection happens only through `onNodeClick` (mouse) or via `handleSelectionChange` from RF. Without `nodesFocusable={true}` (default false in React Flow v12) and per-node `tabIndex`, keyboard users cannot Tab into the canvas, cannot select a node to inspect it, cannot trigger Delete/Backspace on a node (the `deleteKeyCode` only fires after selection), and cannot reach the Inspector. Frame Building is effectively a mouse-only mode.

### 5. Palette drag-to-canvas has no keyboard alternative for positioning
`src/ui/frame-building/left-pane/palette-item.tsx:30-60`: palette items are `<button>` elements with `draggable={!disabled}`; the only keyboard interaction is click, which calls `handleClick` in `node-palette.tsx:151-170` and drops the new node at a staggered grid position. Drag-from-palette to drop on the canvas at the cursor (the documented affordance) requires a mouse. Subsequently, the node is at a fixed staggered position and cannot be re-positioned by keyboard (drag is mouse-only via React Flow). Combined with #4, no keyboard-only user can build a usable frame.

### 6. Edge creation requires a mouse drag
`src/ui/canvas/connector-handle.tsx` plus the React Flow `Handle` source/target in `node-frame.tsx`. Both rely on `onMouseDown` / `mousemove` / `mouseup`. There is no keyboard "select source node → press E → select target" path. Combined with #4, creating any edge is mouse-only.

---

## HIGH

### 7. Tooltip hardcodes id `tooltip-content`
`src/ui/primitives/tooltip.tsx:110, 119`. Every Tooltip uses `id="tooltip-content"` and sets `aria-describedby="tooltip-content"` on the wrapped child while open. Multiple tooltips on screen simultaneously (e.g., during keyboard tab-through where focus moves and a hover lingers; or a status-badge tooltip and an icon-button tooltip) duplicate the id — invalid HTML, and the SR will read whichever node `getElementById` returns first. Use `React.useId()` per Tooltip instance.

### 8. Tooltip trigger must be a `<span>`-wrappable element to be reachable
`src/ui/primitives/status-badge.tsx:125-184`. The badge `<span>` is wrapped in `<Tooltip>` for failed conditions, but the span has no `tabIndex={0}`. Keyboard users can never trigger the tooltip explaining why a node is contested/foreclosed; the only path is to mouseover. The status-badge inside React Flow nodes (off-keyboard, see #4) is doubly inaccessible. `src/ui/primitives/ai-attribution-chip.tsx:50-82` has the same pattern (`cursor: "help"` on a non-focusable span), and `src/ui/primitives/glossary-tooltip.tsx` wraps arbitrary children, so its keyboard reachability depends on whatever wraps it.

### 9. WAI-ARIA tabs pattern is incomplete on the output view
`src/ui/argument-running/output-viewer/output-view-tabs.tsx:42-70`. `role="tablist"` and `role="tab"` are set, but: (a) no `aria-controls` linking each tab to its panel id, (b) no `id` / `role="tabpanel"` / `aria-labelledby` on the rendered panel content in `output-viewer.tsx:88-110`, (c) no arrow-key handler — tabbing is forward-only one tab at a time instead of arrow-keys-within and Tab-out. JAWS / NVDA users will hear "tab" announcements but cannot use the expected arrow navigation, and the relationship between tab and content is opaque.

### 10. Coachmark `role="dialog"` lacks modal semantics and focus management
`src/ui/onboarding/coachmark.tsx:34-87`. `role="dialog"` is declared but no `aria-modal`, no autofocus on mount (so the only Escape-able state needs the user to find the "Got it"/dismiss button by tabbing through everything else), and `aria-label="Coachmark"` is generic — multiple coachmarks across the session all announce identically. There is also no focus trap, so Tab can escape into the dimmed background. Escape closing is wired in `useEffect`.

### 11. Drawer focus-restore breaks if trigger unmounted
`src/ui/primitives/drawer.tsx:80-134`. The focus-trap correctly captures `document.activeElement` on open and restores on unmount. But: if the triggering element is conditionally rendered (e.g., a "Highlight on canvas" icon button whose parent row gets filtered out while the drawer is open), the stored ref points at a detached node and `restore_to.focus()` does nothing silently — focus falls back to `<body>` and the user is dropped at the page origin. Same risk in `dialog.tsx:142-159`.

### 12. Dialog focus-trap selector misses ARIA-only focusables
`src/ui/primitives/dialog.tsx:144-148, 165-184`. The selector `'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'` excludes elements that are focusable via roles (`role="button"` divs, `role="radio"` cards in `new-frame-wizard.tsx`). The wizard's mode/flavor "radio cards" are real `<button>` so they are caught — but if any consumer adds a `<div role="button" tabIndex={0}>` inside a dialog (the OutlineTreeRow pattern, FrameSummaryCard pattern), Tab will skip past it / cycle wrong.

### 13. Dialog tab-trap allows tabbing into background page elements between calls
`src/ui/primitives/dialog.tsx:165-184`. The trap fires `e.preventDefault()` only when `document.activeElement === first` (shift-tab) or `=== last` (tab). The browser's natural tab order between those endpoints is undisturbed — so any element with explicit `tabIndex=0` outside the dialog but inserted into the document after open (e.g., an asynchronously-mounted toast with a Dismiss button, see `toast.tsx:187-209`) becomes tabbable from inside the dialog. Also, when the dialog body holds zero focusables (rare but possible during a loading state), the trap silently does nothing.

### 14. Tab order from top-bar to canvas to side panes is not predictable
The skip-link is broken (#1), so first-Tab goes to the home button → mode toggle (segmented radio: only the active option is in tab order, correct) → frame title (h1, no tabIndex — skipped, see #3) → mode/flavor chip (skipped) → validation indicator (a `<button>`) → version history / settings / help / sign-out (icon buttons). From there Tab moves to the **left palette** (each PaletteItem is `<button>`), then **outline tree** (only the focused row, tabIndex=0; arrow-keys work — good), then to the **canvas region which has no focusable children** (#4), then to the **right Inspector**, then **bottom validation drawer** when open. Result: keyboard user reaches every chrome surface, then has the entire center pane vanish from the tab order, then resumes on the right pane. No way to confirm "I am at the canvas now" except by inference.

### 15. Spinner duplicates `role="status"` semantics in nested contexts
`src/ui/primitives/loading-screen.tsx:48-67`. The Spinner is `role="status"` with `aria-label="Loading"`. It is then used inside `<Button leading={<Spinner />}` (sign-in, suggestion drawer, home page tutorial button), inside `InlineLoading`, and inside other status containers. Multiple stacked `role="status"` regions on the page mean SR users hear "Loading. Loading. Loading…" on certain interactions (page boot + suspense fallback + button spinner). At minimum the button-leading spinner should suppress the role (or the button itself should carry `aria-busy="true"` and the spinner should be `aria-hidden`).

### 16. Pin star icon-button does not announce as a toggle correctly
`src/ui/home/frame-summary-card.tsx:119-148`. The `IconButton` uses `aria-pressed={is_pinned}` (good, that's a real toggle), but the visible glyph swap is two `<UIcon name="star">` with one having `opacity: 0.35`. SR users get the pressed state from `aria-pressed`, sighted users get it from opacity. The hidden `<span>` inside contains a literal "★"/"☆" — but it's `aria-hidden="true"`, so it carries nothing for AT. The aria-label correctly flips between "Pin frame" / "Unpin frame" — but the label is also the announced name, so the pressed state is redundant with the label change. This works but is confusing; pick one (label OR aria-pressed) and stick with it.

### 17. Validation row list semantics are broken
`src/ui/frame-building/validation-drawer/validation-row.tsx:22`. Each row is `role="listitem"`, but the surrounding container (`validation-drawer.tsx:126-178`) wraps the rows in a `<div>` without `role="list"`. Per the ARIA spec, an orphan `listitem` is invalid and AT may either silently demote it to a generic element or announce "list with no items". The error/warning groups also lack region/list semantics. The TopBar slot uses `<header>` but the validation drawer's inner header is a plain `<div>`.

### 18. `aria-invalid` and `aria-describedby` are never wired up for forms
Grep across `src/ui` finds **one** use of `aria-busy` (FrameSummaryCard), zero of `aria-invalid`, zero of `aria-describedby` (other than Tooltip's hardcoded id). Sign-in's password "Minimum 8 characters" hint (`sign-in-screen.tsx:192-201`) is not linked via `aria-describedby` to the password input. When the user submits with a too-short password, the `InlineAlert` with role="alert" announces — but the password input itself never gets `aria-invalid="true"`, so SR users don't know which field is wrong. Same problem in the New-Frame Wizard title field, the FrameTitle inline editor, the Authority editor, and every other input.

### 19. `inert` attribute on Drawer is a string `""` — typing kludge that may not behave
`src/ui/primitives/drawer.tsx:194-195`: `{...(!open ? ({ inert: "" } as { inert: string }) : {})}`. The TS coercion works at the React level, but the rendered DOM value is `inert=""` which is correct (HTML inert is a boolean attribute), so this is fine functionally — flagging because the comment promises "removes from tab order and pointer events while keeping in DOM" but the value also means the slide-out animation continues to fire keystrokes against focused-but-now-inert children. In practice OK; a fast `inert` polyfill check in older Safari is worth verifying.

### 20. Foreclosed status color carries red sub-cast on neutral background
`src/ui/styles/tokens.css:39-42`. `--color-status-foreclosed-accent: hsl(355 38% 42%)` against `--color-status-foreclosed-bg: hsl(30 8% 88%)`. Computed contrast is ~5.0:1 — passes WCAG AA for normal text, fails AAA. The pill uses this on a `font-size-2xs` (10px) glyph in legal sub-flag pills (`status-badge.tsx:189-213` for binding/persuasive — the foreclosed accent is reserved but the same pattern repeats). At 10–11px, AA recommends 4.5:1, so it passes — but the differentiator between foreclosed (red-tinted) and contested (orange) collapses for low-vision users on a desaturated screen. The status badge also relies on glyph shape (X vs. triangle) so color alone isn't the only carrier — good.

---

## MEDIUM

### 21. Tertiary text on pane background contrast is borderline
`tokens.css:13-18`. `--color-text-tertiary: hsl(30 6% 46%)` — the comment cites 4.6:1 against white (`--color-surface-elevated`) which is the AA threshold. But the same token is used on `--color-surface-pane` (hsl(36 12% 95%)) in many places: timestamp text in `FrameSummaryCard` footer (font-size-xs / 11px), `InlineEmpty` body, version-tree timestamps, dismissed-warnings caption. On the pane fill, the computed contrast drops to roughly 4.3:1 — under AA for normal text, just over for large. The 11px `relativeTime` strings fall under "normal text" by WCAG sizing.

### 22. `--color-text-secondary` on hover surface fails AA
`--color-surface-hover: hsl(36 14% 92%)`. Buttons and rows transition to this on hover. Secondary text color `hsl(30 6% 38%)` (~5.4:1 on white) drops to ~4.7:1 on hover, which is fine — but the ghost button has `color: var(--color-text-secondary)` and hover swaps to `color: var(--color-text-primary)`, so this is mitigated. Worth a recheck if the design ever weakens the hover swap.

### 23. Dialog backdrop click closes onboarding's wizard step (only when escapes are allowed)
`src/ui/onboarding/onboarding-wizard.tsx:31-44` explicitly disables both backdrop and Escape dismissal (P0-15 fix). Good. But the **HomePage's wizard** (`src/ui/home/home-page.tsx:333-349`) does NOT pass `dismiss_on_click_outside={false}`, so a user filling out the new-frame form can lose their input by clicking the dimmed area. SR/keyboard users typically Escape, which also discards.

### 24. Reduced-motion does not silence the recompute-pulse marker visibility
`src/ui/argument-running/interview-pane/recompute-indicator.tsx:24-26` correctly switches `argmap-recompute-pulse` for `argmap-recompute-flash` (opacity-only) under reduced motion — but the keyframe `argmap-recompute-flash` itself goes `0 → 1 → 0` over 600ms which the catch-all `transition-duration: 0.01ms !important` in `global.css:1225` will collapse to instant. The keyframe is animation-based, so the `animation-duration: 0.01ms !important` rule (same block) collapses it too. The user sees the dot **never** appear under reduced motion. The recompute indicator is the ONLY signal that a save/recompute happened — silencing it removes critical feedback.

### 25. Status badge animation never replays for SR users
`src/ui/styles/global.css:608-622`. The `argmap-status-pop` keyframe animates scale + opacity on status change. There is no `aria-live` region announcing status transitions, so SR users get no feedback when a node's status flips from open → satisfied. The status text is on the badge (`aria-label="Status: satisfied"`), but a re-render of the same text inside the same element does NOT trigger SR re-announcement.

### 26. CanvasToolbar overlays the canvas with no skip control
`src/ui/canvas/canvas-toolbar.tsx`. Six icon buttons (zoom in/out/fit/100%, auto-arrange, foreclosure layer, search) are positioned absolutely at the top of the canvas with `z-index: var(--z-canvas-toolbar)`. They are correctly labeled and reachable by Tab — BUT for SR users they live in tab order right after the palette/outline (because the canvas has no focusable nodes), so keyboard users tab into "zoom in" and then "zoom out" before encountering the right-pane Inspector. A `role="toolbar"` with `aria-label="Canvas tools"` would let AT users skip past this cluster as one unit.

### 27. MiniMap has zero AT semantics
`src/ui/canvas/minimap.tsx`. Renders React Flow's MiniMap with custom colors. No `aria-hidden`, no `aria-label`, no announcement to AT. The mask color reads as visual chrome for sighted users but AT users hear the SVG nodes as "image, image, image…" or unstyled groups depending on the React Flow version.

### 28. Empty state uses `<p>` headings (not real `<h2>`)
`src/ui/primitives/loading-screen.tsx:108-117` — the EmptyState "label" is a `<p>` with `font-weight: medium`. Same in `home-page.tsx:241-279` (the centered EmptyState renders `<p>` with `font-weight: medium`). SR users get no "heading" landmark to navigate to the empty state's main message. HomePage is the first surface after sign-in; a missing heading at the empty state breaks rotor/landmarks navigation.

### 29. Heading hierarchy skips levels
HomePage: `<h1>argmap</h1>` (header) → `<h2 className="argmap-section-heading">Pinned/Recent</h2>` → `<h3>` in cards. Frame title is `<h1>` in the top bar of FrameBuildingPage; the next visible heading is `<h3 className="argmap-section-heading">` in panels (`HelpGlossaryPane`, `OnboardingPreferencesSection`, `MetadataSection`, etc.). `<h2>` is essentially absent on the interior pages, so the page outline is `h1 → h3 → …` which fails WCAG 1.3.1 (info-and-relationships) for screen-reader navigation. The Welcome screen uses `<h2>` then `<h3>` (correct), but is wrapped in a dialog, so its outline doesn't propagate to the page.

### 30. Validation drawer header span lacks heading semantics
`src/ui/frame-building/validation-drawer/validation-drawer.tsx:72-81`. "Frame issues" is rendered as `<span style={{ fontWeight: semibold }}>` inside the drawer header bar, not as `<h2>`. The DrawerHeader primitive (`drawer.tsx:18-35`) is just a `<div>` with header-like styling but no heading element. Same in `RestoreConfirmDialog`, `FrameSettingsPanel`, `SessionSettingsPanel`, `HelpGlossaryPane` (uses `<span>Help & Glossary</span>` then `<h3>` for sections). No drawer or dialog gives its title to AT as a heading.

### 31. Toast dismiss button uses raw `<button>` not IconButton
`src/ui/primitives/toast.tsx:187-209`. The dismiss button is hand-styled with `border: "none"`, no `:focus-visible` ring from the unified `.argmap-icon-btn` halo, and `min-width/height: 24` — but it correctly has `aria-label="Dismiss notification"`. Functionality is fine; visually the focus ring is the browser default outline (which `global.css:97-101` overrides only on `:focus-visible`, so it does still get the global accent outline — verified by the `:focus-visible { outline: … solid var(--color-mode-current-accent) }` block).

### 32. Suggestion drawer has no `onClose`
`src/ui/ai-suggestion/suggestion-drawer.tsx:46-141`. The `<Drawer>` is opened with `is_open` but never wired with `onClose` — meaning Escape does nothing (the drawer's escape handler is wired but `onClose?.()` is no-op). To dismiss the suggestion the user must click one of the three buttons. Keyboard users have no panic-out option. (The model is "AI suggestion needs a decision", but Escape should at minimum be ambiguous-equivalent-to-Reject, the most conservative action.)

### 33. Edge creation popup is mouse-positioned and not focusable as a list
`src/ui/canvas/edge-creation-popup.tsx:44-89`. When the user drops an edge between two nodes, this popup shows a list of candidate edge types at the drop coordinates. The candidates are `<button>` rows with no `role="menu"` / `role="menuitem"`, no `aria-activedescendant`, no arrow-key navigation. Escape closes (good). Mouse-only callers benefit; tab order is per-button DOM order which works but is not announced as a menu.

### 34. `<button>` inside `<article role="button" tabIndex={0}>` (FrameSummaryCard) creates nested interactive elements
`src/ui/home/frame-summary-card.tsx:64-194`. The card itself is `role="button"` and the IconButton (pin) and Button (run argument) live inside it. Keyboard users Tab through: card → pin button → run-argument button → next card. The card uses `onKeyDown` to gate Enter/Space to the card-root only (line 51-61) and `onClick` to filter out nested target hits — these mitigate the nested-button issue but the underlying ARIA pattern (interactive widgets nested inside interactive widgets) is discouraged. SR users hear "button, three buttons; button, three buttons" repeated.

### 35. Multiple `<h1>` on FrameBuildingPage (chrome) + HomePage (body)
Both pages render an `<h1>`: HomePage has `<h1>argmap</h1>`, FrameBuildingPage has FrameTitle as `<h1>`. Single-page apps render only the FrameBuildingPage at a time, but the FrameTitle `<h1>` is wrapped in the top bar, NOT inside `<main>` (because `<main>` has `display: contents` and the FrameTitle sits in the TopBar `<header>` element above). The page outline is then: `<header>h1 (frame title)` → `<main>` with no headings of its own until panels render `<h3>` sections. The frame title is the page's effective title but is announced as part of the top-bar landmark, not the main content.

---

## LOW

### 36. ConnectorHandle is rendered absolutely-positioned without any `role`/label
`src/ui/canvas/connector-handle.tsx:69-87`. A 12×12 colored circle absolutely-positioned at the bottom of each node, intercepting mousedown to start an edge drag. No role, no aria-label, no keyboard interaction. The companion `<Handle>` from React Flow inside `node-frame.tsx` similarly has no SR exposure.

### 37. `KEEP RAW` markers indicate intentionally-bypassed Button primitives
`src/ui/chrome/validation-indicator.tsx:42-75`, `src/ui/canvas/edge-creation-popup.tsx:62-86`, `src/ui/argument-running/output-viewer/output-view-tabs.tsx:52-70`, `src/ui/frame-building/frame-settings/pin-archive-delete-section.tsx:79`, `src/ui/frame-building/left-pane/palette-item.tsx:31`, `src/ui/version-history/version-tree-row.tsx:34`. Each KEEP RAW marker means a `<button>` was hand-rolled rather than going through the IconButton/Button primitive — losing the unified `:focus-visible` halo (`.argmap-icon-btn:focus-visible` etc. from `global.css:333-345`). On Tab focus, these surfaces fall back to the global `:focus-visible` rule (an outline) which works but doesn't compose with their own borders/shadows like the IconButton's 3px accent-bg halo. Inconsistency, not a barrier.

### 38. ValidationIndicator hover style requires mouse to invert background
`src/ui/chrome/validation-indicator.tsx:65-70`. Hover and unhover use `onMouseEnter`/`onMouseLeave` inline handlers to set background. Keyboard focus does NOT trigger the hover style — the affordance reads as button-not-button on keyboard focus. The global `:focus-visible` halo does apply, so the button is identifiable; this is purely the mouse-only "soft hover" that's missing.

### 39. AiAttributionChip hover uses inline event handlers, also mouse-only
`src/ui/primitives/ai-attribution-chip.tsx:71-76`. Same pattern: `onMouseEnter` / `onMouseLeave` set `borderColor` inline. No keyboard equivalent and the chip isn't focusable anyway (#8).

### 40. Native `<input type="checkbox">` restyle preserves semantics but with caveats
`src/ui/styles/global.css:238-299`. The styling uses `appearance: none` with custom checkmark via `::after` — semantically valid, focus-visible adds a 3px halo (`global.css:290-294`). One concern: the disabled state uses `opacity: 0.5` only; no `background` change, no `cursor: not-allowed` distinction from disabled state — verified line 295-299 does set `cursor: not-allowed`, OK. Note: VoiceOver / NVDA still announce native role/state correctly because the actual input element is in the DOM.

### 41. CanvasEmptyState rendered in a Suspense fallback as `<LoadingScreen>` lacks `aria-busy` on the route
`src/ui/app-routes.tsx:136`. The Suspense fallback is the LoadingScreen (good — has `<Spinner role="status">`). But the parent `<main>` does not set `aria-busy="true"` while content is loading, so AT users who scroll through landmarks during page navigation don't get a "main, busy" announcement.

### 42. Confirmation dialogs' destructive variant relies on red color alone
The destructive-solid Button (`global.css:476-494`) uses red background + white text — passes WCAG AA contrast easily (the white-on-red passes AAA), but no icon. SR users hear "Delete" as the button label; sighted color-blind users may not register the red severity. The "Type the frame title to confirm" pattern (#43 below) compensates for the destructive intent, but other confirms (cascade-delete, restore version, mode change) rely on the visual variant alone.

### 43. Type-to-confirm pattern is unlabeled
`src/ui/frame-building/frame-settings/pin-archive-delete-section.tsx:137-149`. The `<input>` is inside a `<label>` that wraps text "Type the frame title to confirm:" — good, the label is correctly associated implicitly. The warning ("Type the title exactly to enable Delete.") is a sibling `<p>` not linked via `aria-describedby`; SR users hear the label and the input but not the inline warning. The error/warning live region semantics are missing.

### 44. Cascade-delete dialog body lacks structured AT navigation
`src/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog.tsx` + `cascade-summary-tree.tsx`. The body shows a tree of nodes/edges to be deleted. The container has no `role="tree"` (the OutlineTree pattern would apply); count badges in the title (`Delete N nodes and M edges`) are the only AT signal of scope. SR users get a numeric count but cannot navigate the structure to verify which nodes will be removed.

---

## POLISH

### 45. No `@media print` stylesheet
A grep across `src/ui/styles` finds zero `@media print` rules. The user is a future attorney who will likely print frames as exhibits or for offline review. The current screen styles (mode-accent colors, gradient backgrounds, status-pill backgrounds) will print poorly without overrides. Even a minimal print sheet that strips backgrounds, ensures text-on-white, and hides chrome (top bar, toolbars, drawers) would substantially improve printability.

### 46. Skip-link visible-on-focus styling depends on `:focus,:focus-visible` both
`src/ui/styles/global.css:163-167`. The `argmap-skip-link` reveals on either pseudo-class. Modern browsers (Chrome, Firefox, Safari 15.4+) treat anchor `:focus` as `:focus-visible` only on keyboard activation — so the link does correctly hide on mouse activation. Older Safari may show it on any focus, including programmatic. Acceptable.

### 47. Tooltip rendering uses `position: fixed` without portal
`src/ui/primitives/tooltip.tsx:117-144`. The tooltip is appended inline next to the trigger in the React tree but positioned `fixed`. With `pointerEvents: "none"` it can't be hovered or focused, so it disappears the moment focus moves. This is intentional but means the tooltip can never be made dismissible-via-Escape per WCAG 1.4.13 (Content on Hover or Focus). The tooltip does dismiss on Escape (line 72-77), so this is technically fine — but only because the trigger still has focus when Escape fires.

### 48. `font-size-xs` (11px) is widely used for tertiary text
`tokens.css:131-138`. 11px is below most readability heuristics (12-13px baseline). Used in pill chips, validation row hints, timestamp text. Combined with the contrast notes (#21, #20), low-vision users have multiple small-text surfaces to squint at. POLISH because it's a design-system call, not strictly a WCAG failure (no minimum text size in WCAG).

### 49. Status badge tooltip content uses `<ul>` markup unwrapped from list semantics
`src/ui/primitives/status-badge.tsx:174-184`. Failed conditions render as a `<ul>` inside the tooltip body — good list semantics. But the parent Tooltip wraps it in a div `role="tooltip"`, so SR users do hear "list, N items" once the tooltip is announced. With #8 (badge not keyboard-focusable), the keyboard user never hears any of this.

### 50. Onboarding wizard inside HomePage's Dialog uses ghost cancel button below primary
`src/ui/onboarding/new-frame-wizard.tsx:168-180`. Cancel and Create are in a flex row with `justifyContent: "flex-end"` — Cancel on the left, Create on the right. Standard convention. The wizard's `Cancel` button doesn't carry `data-variant="ghost"` semantics for AT, just visual. Fine.

### 51. Mode-accent cascade across `[data-mode]` works for chrome but doesn't propagate into `<dialog>` children
`tokens.css:222-235` sets `--color-mode-current-accent` based on `data-mode` on `<html>`. Dialogs portal to `document.body` (well, technically rendered inline but visually overlay) — `document.body.dataset.mode` is set in `app-routes.tsx:69-74`, so the cascade does work. But: when the user opens FrameSettingsPanel from FrameBuildingPage (frame mode), the accent reads orange; if they then click "change mode" and toggle to General Personal flavor, the displayed dialog's accent doesn't update mid-modal because the data-mode on body still reflects the original page mode. Minor — the dialog closes after commit.

### 52. ReactFlow background canvas color uses raw CSS var (line wrong for older Safari)
`src/ui/canvas/frame-canvas.tsx:780`: `<Background color="var(--color-border-subtle)">`. React Flow's `<Background>` expects a color value, not a CSS var string. Some versions of React Flow do pass the var literally to SVG `fill`, which Safari 14- may render as the default (black) dots. Not strictly an a11y issue, but the cosmetic regression shifts the dot grid's contrast against the canvas.

---

## Cross-cutting summary

- **Skip link, canvas keyboard, click-to-edit titles**: three high-traffic surfaces that completely block keyboard / SR users from doing routine work (#1, #3, #4, #5, #6). These are the highest-priority items if the user is going to use this product professionally.
- **ARIA correctness**: `aria-pressed` mis-applied (#2), tab pattern incomplete (#9), tooltip id collision (#7), list/listitem orphans (#17), missing `aria-invalid`/`aria-describedby` on forms (#18), missing `role="tabpanel"` linkage.
- **Headings**: skipped levels (#29), drawer/dialog headers not semantic (#30), empty-state labels as `<p>` (#28).
- **Reduced motion**: tokens are honored everywhere, but the recompute indicator's only feedback channel is silenced under reduced motion (#24). Worth a targeted fix.
- **Color contrast**: tertiary text on pane fill is borderline (#21), foreclosed accent is on the edge for AA at small sizes (#20). The token file shows the team is contrast-aware (`tokens.css:15-17` shows a previous fix for this); a sweep of remaining surfaces is warranted.
- **No print stylesheet** (#45) — a soft expectation for a legal product.

Total findings: **52** (6 CRITICAL, 14 HIGH, 15 MEDIUM, 9 LOW, 8 POLISH).
