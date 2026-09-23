# Onboarding, NewFrameWizard, Welcome Screen, Coachmarks, NewFeatureNotice — Audit Findings

Scope: First-launch flow plus per-feature pop-up surfaces. User perspective. No fixes.

Severity buckets: HIGH (data loss, blocked flow, contract violation), MEDIUM (accessibility / wrong behavior surfacing), LOW (cosmetic, copy drift, defensive-only).

---

## HIGH

### H1. Welcome-screen gating bypasses the documented coachmark mechanism — `selectFirstLaunchDismissed` reads the wrong field

`/Users/zacharywolk/zwolk/argmap/src/state/selectors.ts:380-382` defines:

```ts
export function selectFirstLaunchDismissed(app_state: AppState): boolean {
  return app_state.dismissed_warnings?.["first_launch"] === true;
}
```

But `/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark-registry.ts:12` exports `FIRST_LAUNCH_COACHMARK_ID = "welcome_screen"` and the spec (`docs/stream_i_ui_onboarding_spec_v1.html` line 71) says the selector returns `state.coachmark_dismissals[FIRST_LAUNCH_COACHMARK_ID] === true`. So the welcome-screen gate, the dismissal write site (`app-routes.tsx:150, 166` → `dismissWarning("first_launch")`), the reset compensation (`onboarding-preferences-section.tsx:13` → `undismissWarning("first_launch")`), and the registry name are not actually wired together. The whole "welcome screen is a coachmark" model documented in `coachmark-registry.ts` and in the spec is fiction; the runtime treats the welcome screen as an unrelated warning. **User impact:** the ConfirmDialog body promises "All coachmarks and the welcome screen will re-appear" (`onboarding-preferences-section.tsx:59`); the welcome screen only re-appears because the section makes an extra `undismissWarning` call. Anyone wiring a new reset path (or QA harness) who only calls `resetCoachmarks()` will not bring the welcome screen back. Equally, `dismissCoachmark(FIRST_LAUNCH_COACHMARK_ID, true)` — which the registry's existence implies you can do — has no effect on the welcome screen.

### H2. Submit failure is silently swallowed — the user clicks "Create frame," nothing happens, the form looks identical

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:14` types `onSubmit` as `(args) => void`. `handleSubmit` (line 46-54) fire-and-forgets it. `OnboardingWizard.handleSubmit` (`onboarding-wizard.tsx:22-24`) awaits but has no try/catch. `AppOnboardingMount.onSubmit` (`app-routes.tsx:153-170`) is `async` but if `createFrame` rejects (offline, Supabase RLS denied, quota exceeded) the rejection propagates up to a render-callback boundary with no UI handling — no toast, no inline error, no spinner cleared, no retry signal. The "Create frame" button is not disabled while the call is in-flight either (`canSubmit()` at `new-frame-wizard.tsx:39-44` only checks form fields). **User impact:** offline first-launch user types a title, clicks Create frame, sees nothing change, clicks again (now they have two concurrent in-flight `createBlankFrame` calls and an orphan frame may persist on reconnect).

### H3. Title input accepts unbounded length — paste a 10k-character "title" and persistence + UI break later

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:136-144` renders `<input>` with no `maxLength`. No client-side cap. `canSubmit` (line 44) only checks `.trim()` is non-empty. **User impact:** a panicked paste of a brief excerpt becomes the frame title, then renders into FrameSummaryCard tiles, the top-bar breadcrumb, version-history change summaries, and the search-index payload. The frame may then fail a Supabase column-length check on a later save while looking saved locally.

### H4. AppState writes are debounced 1 second — dismissing the welcome screen and reloading inside 1 s loses the dismissal

`/Users/zacharywolk/zwolk/argmap/src/persistence/autosave.ts:18, 119-126` debounces every AppState mutation by `APP_STATE_DEBOUNCE_MS = 1000`. `dismissWarning("first_launch")` (`app-state-store.ts:205-213`) only calls `scheduleAppStateSave`. The Skip and Submit handlers in `AppOnboardingMount` (`app-routes.tsx:149-170`) do not call `flushAppState()` or `flushAll()`. **User impact:** user opens app, clicks Skip introduction, immediately closes the tab (or `Cmd+R`s, or the device sleeps + tab is evicted) within 1000 ms, then next open shows the welcome screen again. Same risk for Submit → navigate to frame-building → reload before debounce: lands at empty Home plus welcome again. Combined with H1, the welcome-screen "stickiness" is fragile.

### H5. Welcome-screen exit animation is dead — the dialog snaps out, no fade

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-wizard.tsx:13-20` returns `null` immediately when `!props.open` (line 20) AND hardcodes `<Dialog open={true} ...>` on line 32 (the comment explains why click-outside dismiss was disabled — but the side-effect is the Dialog's `open` is never `false`, so its three-phase mount state never enters `"exiting"`). The exit animation logic at `dialog.tsx:113-134, 191, 195` (160 ms fade-out + pop-out) is unreachable for this dialog. **User impact:** every other dialog in the app fades out (`argmap-overlay-fade-out`, `argmap-dialog-pop-out`); the onboarding wizard alone vanishes mid-frame on Skip/Submit, breaking the visual rhythm of the very first interaction.

### H6. Coachmark anchors are stale after layout changes — popover detaches from anchor

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx:15-20` reads `getBoundingClientRect()` once on mount inside an effect that depends only on the (stable) `anchor_ref`. No resize listener, no scroll listener, no `ResizeObserver`, no `IntersectionObserver`, no rAF reposition. **User impact:** any scroll, window resize, pane open/close, drawer toggle, or sidebar collapse leaves the coachmark sitting at the original viewport coordinates while the anchor moved. Worse, if the anchor scrolls off-screen the coachmark stays visible at the old position — pointing at empty space.

---

## MEDIUM

### M1. Mode/Flavor radio cards use the wrong ARIA semantics and have no group

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:243-244` sets `role="radio"` + `aria-pressed={active}`. `aria-pressed` is the property for toggle buttons; a `role="radio"` needs `aria-checked`. There is no `role="radiogroup"` wrapper around the Choice grid (lines 234-288). **User impact:** screen readers announce the cards as toggle buttons in indeterminate state and don't expose "1 of 2" group context. Sighted-AT users hear the wrong widget identity.

### M2. No arrow-key navigation between radio cards; each is its own tab stop

Same file, `new-frame-wizard.tsx:240-285`. A keyboard user tabs through Legal → General → flavor cards → title → description → submit, instead of arrow-keying within the radio group (the standard for actual radio widgets). **User impact:** keyboard-only users (and the spec itself, which mentioned "keyboard navigation (arrow keys cycle, Enter activates focused)" at the spec table for `wizard-step-mode.tsx`) get a more verbose, non-standard interaction. The spec explicitly lists this missing behavior.

### M3. Initial Dialog focus lands on the Skip button — Enter on first open dismisses onboarding

`/Users/zacharywolk/zwolk/argmap/src/ui/primitives/dialog.tsx:143-148` auto-focuses the first focusable descendant. `/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/welcome-screen.tsx:104-110` places `welcome-skip` (Skip introduction) before `welcome-start` (Start). So the welcome screen opens with focus on Skip. **User impact:** a user who reflexively hits Enter on the very first screen permanently skips onboarding (subject to H4's 1-second window). E7 explicitly names the Start button as the "default" CTA.

### M4. Welcome-screen copy drift — Start button reads "Create your first frame" rather than the canonical "Start guided first frame"

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/welcome-screen.tsx:27`: `start_label: "Create your first frame"`. Spec `/Users/zacharywolk/zwolk/argmap/docs/stream_e_uiux_v1.html:452` mandates "Start guided first frame." `WIZARD_STEP_TITLES = ["Mode", "Flavor", "Details"]` (`new-frame-wizard.tsx:29`) also drifts from the spec's five-step list (Mode → Flavor → Jurisdiction → Title/Desc → Template). Multiple verbatim-copy assertions in the test suite enforce only the title and three section headings, not the button labels.

### M5. WelcomeScreen has no `<DialogHeader>` and the dialog is labelled "Onboarding" generically

The wizard sets `aria_label="Onboarding"` (`onboarding-wizard.tsx:34`). WelcomeScreen renders an `<h2>` (`welcome-screen.tsx:40-50`) but neither passes an `id` nor uses `aria_labelledby` on the Dialog. **User impact:** screen-reader users on first launch hear "Onboarding, dialog" — not the actual title sentence, which is the only content that explains what the dialog is about.

### M6. Stage transition welcome → wizard has no announcement; the form pops in silently for AT users

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-wizard.tsx:38-42` swaps children based on local `stage` state with no `aria-live`, no focus move into the wizard, no announcement. The Dialog's focus-restore logic only fires on close (`dialog.tsx:142-159`), not on inner-content change. **User impact:** a screen-reader user clicks Start, sees no announcement, and the focus stays where it was (on the now-unmounted Start button). The next Tab may land anywhere depending on browser fallback.

### M7. Coachmark is `role="dialog"` but lacks focus trap, `aria-modal`, focus restore — semantically a dialog without any dialog behavior

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx:34-35` sets `role="dialog" aria-label="Coachmark"`. There is no focus trap, no `aria-modal`, no focus move into the popover on mount, no focus return after dismiss. Compare with `Dialog` (`dialog.tsx:143-188`) which does all of the above. The correct role for an anchored hint is `tooltip` or `note`. **User impact:** screen-reader users hear "dialog" and expect modal semantics that don't exist; sighted keyboard users get no focus move so the "Got it" button is reachable only by tabbing into it.

### M8. Coachmark Escape listener is global and unguarded — Escape inside the open wizard may dismiss the coachmark instead of the wizard

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx:22-28` adds a `document`-level keydown listener that calls `on_dismiss()` on Escape — and the Dialog primitive (`dialog.tsx:161-187`) also has a `document` keydown listener. No `stopPropagation`, no `preventDefault`, no priority discipline. **User impact:** in a session where a coachmark and a dialog are both open (e.g., a coachmark anchored on a top-bar button while the version-history dialog is up), Escape will fire both handlers (with the wizard's own `dismiss_on_escape={false}` masking some cases). Behavior depends on listener attach order — non-deterministic.

### M9. Coachmark second effect deps are `[props]` — listener re-binds on every parent render

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx:28` closes the effect over `[props]`, so every re-render of the parent that re-creates the props object will detach + re-attach the document keydown listener. **User impact:** wasteful, and during the brief interval between detach + reattach a fast Escape may be missed (in practice this is a microtask, but the larger smell is correctness — the listener is identity-stable and should not be in the deps).

### M10. `autoFocus` on the title input fights Dialog's first-focusable auto-focus

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:142` sets `autoFocus` on the title input. The parent Dialog effect (`dialog.tsx:143-148`) also moves focus to the first focusable (which would be the Mode "Legal" button, lines 86-91). The result depends on render/effect ordering — typically the `autoFocus` attribute wins because it's applied synchronously during mount before the Dialog's `useEffect` runs, but the visible behavior is "focus jumps from Legal to Title after mount." **User impact:** focus jitter on stage transition; screen-readers may announce twice.

### M11. `useCoachmark` throws at hook-call time if the id is invalid

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/use-coachmark.ts:13` throws `UnknownCoachmarkIdError` outside any try/catch. **User impact:** if any consumer ever passes a dynamic id (e.g., from a feature flag, a URL param, a runtime config) and it's invalid, the entire parent component tree crashes — there is no error boundary catching this in the onboarding surface. Severity hinges on the consumer always passing a literal; today they do, but this is a sharp edge.

### M12. `dismiss_on_act` is just an alias for `dismiss` — no auto-dismiss-on-affordance-action semantics

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/use-coachmark.ts:22` returns `dismiss_on_act: dismiss`. The spec at `docs/stream_i_ui_onboarding_spec_v1.html:104` explicitly contrasts the two: "Acting on the affordance auto-dismisses. The hook returns a `dismiss_on_act` the consuming site calls when the underlying affordance fires." The implementation collapses the distinction. **User impact:** no functional bug today (no caller uses it), but new wirings that treat `dismiss_on_act` as a separate semantic will silently get the same behavior as a manual dismiss — and any future analytics, "did the user act vs. ignore" telemetry, etc., would be broken.

### M13. New-frame wizard Submit has no in-flight indicator and no double-click guard

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:172-179` renders the submit button with `disabled={!canSubmit()}` only. No `pending` state, no spinner (Button supports `leading={<Spinner/>}` per the home page), no disabled-while-awaiting. **User impact:** while the async `createFrame` round-trip is in flight, clicking again starts another. Two frames may be created. The home page's New-frame dialog has the same wizard but Home doesn't guard either — see Findings I3.

---

## LOW

### L1. Title input has no `autoComplete` attribute — browsers may offer unrelated saved values

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:136-144`. **User impact:** Chrome/Safari may suggest names, emails, or addresses from prior forms. Not a security issue, but visually distracting on first launch.

### L2. Title `<input type="text">` silently strips newlines on paste

Default browser behavior — a multi-line paste becomes one line. The user is given no feedback ("title got truncated to one line"). Combined with H3 (no max length), a paste produces silently mangled content.

### L3. Selecting "General" mode auto-fills flavor to "personal" before the user sees the flavor cards

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:102-108`: `setState((s) => ({ ...s, mode: v as Mode, flavor: v === "general" ? (s.flavor ?? "personal") : null }))`. On Submit, line 52 also defaults to "personal" if nothing chosen. **User impact:** the Personal card renders pre-selected the moment the user clicks General. A user who intended Academic must explicitly switch. The default leak from "uncertain → general" implied by the spec (E7 line 458) and the actual flavor default conflate two different defaults.

### L4. `NEW_FEATURE_NOTICE_DEFINITIONS = []` — registry is an empty placeholder

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark-registry.ts:34, 44`. The whole machinery exists but no notices are defined. Mounting `NewFeatureNotice` requires manually passing `title` + `message` (`new-feature-notice.tsx:11-69`) — there is no consumer of the empty registry. **User impact:** the v1 returning-user new-feature notice E7 promised does not exist; users who upgrade between versions get no announcement of new features. Mount is harmless (no surface mounts a notice).

### L5. OnboardingPreferencesSection at the bottom of the help drawer — discoverability problem

`/Users/zacharywolk/zwolk/argmap/src/ui/chrome/help-glossary-pane.tsx:90` renders `<OnboardingPreferencesSection />` AFTER both the Frame Concepts section (12+ glossary entries) and the Legal Concepts section (5+ entries). In legal mode that's ~17 stacked entries before "Reset coachmarks" becomes visible. **User impact:** a user wanting to see the welcome screen again must (a) know the Help drawer is the right surface, (b) scroll past every glossary term. The spec (line 86) just says "renders as a composed child below the existing two glossary sections" — implementation matches the spec but the UX consequence stands.

### L6. `dismissed_warnings` is missing from `DEFAULT_APP_STATE`

`/Users/zacharywolk/zwolk/argmap/src/state/app-state-store.ts:48-55` omits the `dismissed_warnings` field. The selector at `selectors.ts:381` uses `?.` so reads are safe. **User impact:** none today, but inconsistent — `seen_new_feature_notices` is also missing (`app-state-store.ts:48-55`). Defaults are inconsistent with the `AppState` interface at `repository.ts:60-73`.

### L7. ConfirmDialog body misrepresents the dismissal model

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-preferences-section.tsx:59` says "All coachmarks and the welcome screen will re-appear." This conflicts with H1: the welcome screen is gated by `dismissed_warnings`, not `coachmark_dismissals`, so the reset only works because of the extra `undismissWarning` call on line 13. The copy implies a clean conceptual model that the code doesn't actually have.

### L8. Cross-tab consistency: a peer-tab reset may produce a stale welcome-screen popup mid-session

The cross-tab subscription at `/Users/zacharywolk/zwolk/argmap/src/state/app-state-store.ts:291-298` triggers `loadAppState()` on the local store when a peer publishes `app_state_changed`. If the user resets coachmarks in tab A while tab B has a frame open, tab B's `AppOnboardingMount` (`app-routes.tsx:144-173`) will re-render with `!dismissed = true` and the OnboardingWizard will appear over the user's current frame. **User impact:** unexpected modal popup in a working session. There is no guard for "only show wizard when route is home" or "only on first launch this tab."

### L9. No `prefers-reduced-motion` handling in Coachmark

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx` has no `useReduceMotion` use. The spec (`docs/stream_i_ui_onboarding_spec_v1.html` line 128 — "Respects `useReduceMotion` (fade-in suppressed under reduced motion)") explicitly requires it. **User impact:** today the coachmark has no entrance animation either way (positions absolutely, no transition classes), so this is moot — but the missing hook means any future polish that adds animations won't honor the user preference unless someone remembers.

### L10. `OnboardingWizard` does NOT key NewFrameWizard like HomePage does

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-wizard.tsx:41` renders `<NewFrameWizard onSubmit={handleSubmit} onCancel={props.onSkip} />` without a `key`. Compare `home-page.tsx:345` which uses `key={String(wizard_open)}` specifically to remount and clear stale state. In the onboarding path this is OK in practice because line 20 unmounts the entire OnboardingWizard when `props.open` becomes false, but inside the wizard the welcome → wizard stage change (line 14-18) re-uses the same NewFrameWizard instance across re-opens — and `setStage("welcome")` only runs on the `open` transition, so an in-app reset (which keeps `open` true) would not reset the form. Edge case: if onboarding ever supports "go back to welcome" without unmount, the form state would leak.

### L11. Description textarea has no character limit, no row cap

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:148-156` — `rows={3}` with `resize: vertical`. No `maxLength`. **User impact:** similar to H3 but lower severity since description is not surfaced in tile titles; still, an unbounded paste persists.

### L12. NewFrameWizard renders inside an already-padded Dialog — wastes the title hierarchy

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx:64-72` renders its own `<h2>Create your first frame</h2>` inside the body. The Dialog has no `<DialogHeader>` (compare `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/dialog.tsx:30-59`). The same `<h2>` text appears here AND on the welcome-screen Start button copy ("Create your first frame," from L drift) — so the user sees the same string twice when transitioning from welcome to wizard. Visual redundancy; also another path through which the Dialog gets no `aria-labelledby`.

### L13. Welcome-screen Skip and Start ordering and color carry no clear visual hierarchy

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/welcome-screen.tsx:105-110` renders Skip (variant="ghost") then Start (variant="primary"), justified to flex-end. Compare WCAG / common dialog conventions (primary action on the right of the modal) — this is correct, but combined with M3 (Skip receives initial focus), the user has to override their first instinct with an extra Tab.

### L14. Multi-launch / double-open: opening the wizard twice rapidly is racy

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/onboarding-preferences-section.tsx:14` calls `resetCoachmarks` then `undismissWarning` synchronously, both scheduling AppState saves through the same 1000ms debouncer. If the user (or test) hits "Reset coachmarks" twice quickly, both calls schedule the same payload — fine. But the OnboardingWizard's `useEffect` on `[props.open]` (`onboarding-wizard.tsx:16-18`) re-runs whenever `open` flips false→true→false→true; without a `key`, the stage state machine can race with a redundant re-init. **User impact:** likely visual flicker on rapid open/close, no data loss.

### L15. `dispose: () => {}` no-op original in app-state-store

`/Users/zacharywolk/zwolk/argmap/src/state/app-state-store.ts:269-272` shows the original `dispose` is a comment-only no-op. The wrapped dispose at lines 305-313 unsubscribes the crosstab listeners. **User impact:** out of scope but worth flagging in the larger audit — the onboarding mount has no `dispose` of its own and never unsubscribes anything, so if `AppOnboardingMount` were to ever unmount mid-session (today: never — it's rendered unconditionally), the crosstab subscriptions would leak. Minor.

### L16. The `OnboardingWizard` is mounted unconditionally — even after dismissal it stays in the React tree

`/Users/zacharywolk/zwolk/argmap/src/ui/app-routes.tsx:172` renders `<OnboardingWizard open={!dismissed} ...>` regardless. The wizard returns `null` when `open === false` (`onboarding-wizard.tsx:20`), so DOM cost is zero — but the `useAppStateStore` subscription at line 145 stays active across every route navigation. **User impact:** none functional; just a permanent subscriber for a transient surface.

### L17. The Pinned / Recent home empty-state "New frame" button shares the same NewFrameWizard but no shared validation/error path

`/Users/zacharywolk/zwolk/argmap/src/ui/home/home-page.tsx:333-349` opens a Dialog around NewFrameWizard with its own `onSubmit` handler that mirrors the AppOnboardingMount logic almost verbatim (`home-page.tsx:163-175` vs `app-routes.tsx:153-170`). Two copies of the same flow. **User impact:** copy-paste drift risk for future fixes (e.g., H2's error handling). Not strictly an onboarding bug but worth flagging because the wizard is shared.

### L18. Coachmark popover position has no edge-of-viewport fallback

`/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/coachmark.tsx:18-19`: `setPos({ top: rect.bottom + 12, left: rect.left })`. If the anchor is in the bottom-right of the viewport, the popover (up to 320 px wide, lines 41-46) renders partially off-screen with no flip-to-top fallback and no `overflow` adjustment. The spec at line 128 mentions "preferred-placement fallback rule (largest-area side when preferred placement is constrained)." **User impact:** an anchor near the right edge produces a clipped coachmark with the "Got it" button off-screen.

---

## Summary

| Severity | Count |
|----------|------:|
| HIGH     | 6     |
| MEDIUM   | 13    |
| LOW      | 18    |
| **Total** | **37** |

Cross-cutting themes:

- The "welcome screen is a coachmark" abstraction in `coachmark-registry.ts` is fiction; the runtime treats it as a warning. The reset-coachmarks UI papers over the discrepancy with two calls instead of one. Future maintenance hazard.
- Failure paths in `createFrame` are unhandled end-to-end (UI → state → persistence).
- Two surfaces (`Coachmark`, `NewFrameWizard`) are missing standard a11y semantics: wrong roles, no focus management, no group context, no live regions for stage changes.
- The 1-second AppState debounce + the absence of any `flushAll`/`navigator.sendBeacon` exit hook means several dismissals can be silently lost — most user-visibly on the welcome screen itself.
- The spec-vs-implementation drift is consistent: titles, button copy, step counts, the coachmark gating model, and the `dismiss_on_act` semantics all diverge from the spec while the test suite asserts only the surviving subset.
