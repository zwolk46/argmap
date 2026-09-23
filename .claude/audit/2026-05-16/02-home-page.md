# Audit: Home page (`/Users/zacharywolk/zwolk/argmap/src/ui/home/`)

Scope: landing route after sign-in — `HomePage`, `FrameSummaryCard`, the
new-frame wizard launch, the tutorial CTA, pin/recents/empty rendering, and
navigation handlers `onOpen` / `onRunArgument` / `onStartTutorial` / `onSubmitWizard`.

Primary files reviewed:
- `/Users/zacharywolk/zwolk/argmap/src/ui/home/home-page.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/home/frame-summary-card.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/home/index.ts`
- `/Users/zacharywolk/zwolk/argmap/src/ui/home/README.md`
- `/Users/zacharywolk/zwolk/argmap/src/state/app-state-store.ts`
- `/Users/zacharywolk/zwolk/argmap/src/persistence/supabase-repository.ts`
- `/Users/zacharywolk/zwolk/argmap/src/persistence/repository.ts`
- `/Users/zacharywolk/zwolk/argmap/src/persistence/autosave.ts`
- `/Users/zacharywolk/zwolk/argmap/src/tutorial/create-tutorial.ts`
- `/Users/zacharywolk/zwolk/argmap/src/tutorial/fixture.ts`
- `/Users/zacharywolk/zwolk/argmap/src/ui/onboarding/new-frame-wizard.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/mode-flavor-chip.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/dialog.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/icon-button.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/relative-time.ts`
- `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/loading-screen.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/primitives/toast.tsx`
- `/Users/zacharywolk/zwolk/argmap/src/ui/routing.ts`
- `/Users/zacharywolk/zwolk/argmap/src/ui/app-routes.tsx`
- `/Users/zacharywolk/zwolk/argmap/tests/ui/home/frame-summary-card.test.tsx`

---

## CRITICAL

### 1. Empty-state CTA shown to users who have many frames but no recents/pinned

- **Where:** `src/ui/home/home-page.tsx:60` (`is_empty = pinned.length === 0 && recents.length === 0`) and `:240` (the `is_empty ? <EmptyState …/> : …` branch).
- **User experience:** A signed-in user who legitimately has dozens of frames on disk lands on the Home page and sees "No frames yet — A frame is the logical structure …" with only "New frame" / "Try the tutorial" as CTAs. There is no path from this screen to their existing frames.
- **Details:** `is_empty` derives only from `app_state.recents` and `app_state.pinned`. Those lists are stored in the AppState singleton, which can legitimately be empty when:
  - First boot on a new device where `loadAppState` seeded `DEFAULT_APP_STATE` (`app-state-store.ts:110-122`) — `frames` then loads non-empty from Supabase but `recents` is `[]`.
  - The AppState singleton is missing / reset (the "AppState singleton missing" path at `app-state-store.ts:113`).
  - Cross-tab interaction: tab A deletes all references via the deleteFrame handler at `app-state-store.ts:280-290` (drops ids from recents/pinned), then tab B opens — recents shows blank even though `frames` from Supabase isn't.
  The empty branch never consults `frames.length`, so the user is led to think their frames are lost. The empty-state copy ("No frames yet") is materially false in this case.

### 2. `loadFrames` failure is swallowed — no error surface on Home

- **Where:** `src/ui/home/home-page.tsx:40-42` (`React.useEffect(() => { app_state_store.getState().loadFrames(); }, [...])`) and `src/state/app-state-store.ts:128-136` (the catch sets `error: msg` on the store but Home never reads it).
- **User experience:** If `listFrames` rejects (Supabase outage, RLS misconfigured, network drop, expired session token), the Home page renders the empty state with no toast, banner, retry button, or error message. The user has no way to tell whether their data is missing because their account is empty, or because the load failed.
- **Details:** The Home component never subscribes to `s.error` from the store, never `.catch()`es the promise locally, never renders an `is_loading` indicator while the fetch is in flight, and never wraps the call in a try/catch that pushes a toast. By contrast, `onRunArgument` (`home-page.tsx:113-118`) and `onStartTutorial` (`:155-158`) both surface failures via toast; the data load that determines whether ANY of the Home grid renders is the one place that does not.

### 3. Tutorial creation is non-idempotent — every click creates another Palsgraf frame

- **Where:** `src/ui/home/home-page.tsx:134-161` (`onStartTutorial`) → `src/tutorial/create-tutorial.ts:58-79` (`createTutorial`) → `src/tutorial/fixture.ts` (`buildTutorial` generates new IDs each call: `:164-165`).
- **User experience:** A user who starts the tutorial, bails, returns to Home, and clicks "Try the tutorial" again ends up with two complete Palsgraf frames on their account. After three clicks, three. The tutorial does not detect or reuse an already-created tutorial frame.
- **Details:** `buildTutorial` calls `generateId()` for every node and creates a fresh `frame_id` / `version_id` / `session_id` on each invocation. `createTutorial` issues four `repo.save*` upserts. There is no "find existing tutorial frame by stable marker" lookup, no dedup by `TUTORIAL_TITLE`, no flag in AppState to track that the tutorial has already been instantiated. The role-map is overwritten in `sessionStorage` (`create-tutorial.ts:37-40`) each time, silently invalidating the previous frame's tour anchors if the user reopens it.

### 4. Tutorial creation is non-atomic — orphaned rows on partial failure

- **Where:** `src/tutorial/create-tutorial.ts:71-74` (four sequential `repo.save*` calls without a transaction or compensating rollback) and `src/persistence/supabase-repository.ts:12-18` ("'Atomicity' methods … do their work as a sequence of client writes rather than a true Postgres transaction").
- **User experience:** If the `saveFrameVersion` call (or either of the session writes) fails — quota, RLS, network blip — the user has a half-persisted tutorial in their account: a Frame with no FrameVersion, or a Frame+Version with no Session. The catch in `onStartTutorial` (`home-page.tsx:155`) surfaces a single toast and resets local loading, leaving the user free to retry, which produces yet another partially-written sibling instead of resuming or repairing.
- **Details:** The four writes occur in dependency order (Frame → FrameVersion → Session → SessionVersion) but each is an independent HTTP request. After the first succeeds, `Repository` has no `rollback` API and `createTutorial` issues no compensating `deleteFrame`. The next reload will render the orphaned frame on the Home grid with a broken "current_version_id" pointer that breaks `loadFrameVersion` whenever the user opens it.

### 5. `ModeFlavorChip` labels every flavor-less general frame as "Academic"

- **Where:** `src/ui/chrome/mode-flavor-chip.tsx:17` (`const secondary = mode === "legal" ? undefined : flavor === "personal" ? "Personal" : "Academic";`).
- **User experience:** A general-mode frame created without a flavor (legitimate — `Frame.flavor` is optional in the schema, and `Frame` interface at `src/schema/frame.ts:84` marks `flavor?`) renders on every Home card as `GENERAL · ACADEMIC`. The chip lies to the user about what flavor was chosen.
- **Details:** The ternary collapses two distinct states ("flavor=academic" and "flavor=undefined") into one displayed label. The wizard at `new-frame-wizard.tsx:52` defaults `flavor` to `"personal"` for new general frames at submit time, but any historical row, any frame imported via `FrameExport`, any test fixture, or any frame written directly by a future surface that omits flavor will misrender. Legal-mode frames with a (nonsensical but possible) flavor field are simply dropped silently — the chip never shows it.

---

## HIGH

### 6. `run_argument_pending` guard does not prevent the second click in the same tick

- **Where:** `src/ui/home/home-page.tsx:67-119` (`onRunArgument`), specifically the guard at `:72` (`if (run_argument_pending) return;`) followed by `:73` (`setRunArgumentPending(frame_id)`).
- **User experience:** A double-click on "Run argument" fires two parallel `listSessionsForFrame` + create-session sequences. When no session exists, the second sequence writes a second blank session for the same frame. The user opens one, but a phantom blank duplicate persists in `listSessionsForFrame` results.
- **Details:** `setRunArgumentPending` schedules a React state update; the second click's handler reads the same closure-captured `run_argument_pending === null` because the state has not yet been committed. The `disabled` prop on the inner Button (`frame-summary-card.tsx:168`) is also a snapshot from the previous render — between mousedown 1 and mousedown 2 the button is still enabled. There is no synchronous ref guard or per-frame in-flight set.

### 7. `listSessionsForFrame` does not filter archived sessions

- **Where:** `src/persistence/supabase-repository.ts:253-271` — the query has no `.eq("archived", false)` filter, despite ArgumentSession carrying `archived?: boolean` (`src/schema/session.ts:117-118`) and `listFrames` doing the equivalent filter (`supabase-repository.ts:88`).
- **User experience:** `onRunArgument` opens `existing[0]?.id` (`home-page.tsx:76`). If the most-recently-updated session for a frame is archived, the user is silently navigated INTO an archived session instead of seeing a fresh blank one. There is no warning that they are now editing an archived row.
- **Details:** The DB returns rows ordered by `updated_at desc` regardless of archive state. If the user archived an old session and then comes back to Home and clicks Run, the archived session is the candidate. The session's `archived` flag is also not surfaced anywhere on the Home card.

### 8. `onSubmitWizard` does not catch `createFrame` failures

- **Where:** `src/ui/home/home-page.tsx:163-175` (`onSubmitWizard`) and `src/ui/onboarding/new-frame-wizard.tsx:46-54` (`handleSubmit` calls `props.onSubmit({...})` without `await` or `.catch`).
- **User experience:** If `repository.createBlankFrame` rejects (RLS misconfigured, quota, network drop), the wizard's "Create frame" button reports nothing. There is no toast, no inline error inside the wizard, the dialog does not stay-with-error. The rejection becomes an unhandled promise rejection in the console; the user is left staring at the wizard form.
- **Details:** `home-page.tsx:164-174` awaits the result, calls `setRecent`, `setWizardOpen(false)`, and navigates. There is no try/catch around it. The dialog at `home-page.tsx:333-349` is open-state controlled and `setWizardOpen(false)` is only called inside the success path. If the call throws, the dialog stays open, the navigate never fires, and `setRecent` is never called either.

### 9. Nested interactive controls inside `role="button"` on the card

- **Where:** `src/ui/home/frame-summary-card.tsx:63-91` — `<article role="button" tabIndex={0}>` wraps an `IconButton` (`:119-148`) and a Run-argument `Button` (`:164-180`).
- **User experience:** Screen reader users hear nested-button announcement chaos: the row announces as a button, then "pin frame, button" inside it, then "open an argument session, button" inside it. WAI-ARIA forbids interactive descendants of `role="button"`. Tab order is also surprising: focus lands on the article (Tab 1), then on each inner control (Tabs 2 and 3) per card, multiplying tab stops by 3 across the entire grid.
- **Details:** The component compensates for click bubbling at `:71-75` (`if (target.closest('[data-testid="frame-card-pin"]')) return;`) and for keyboard at `:51-61` (`if (e.target !== e.currentTarget) return;`), but neither workaround addresses the accessibility-tree violation. There is no `aria-describedby` or grouping landmark; AT cannot reliably model the relationship.

### 10. Cross-tab pin / recents propagation lags 5s–30s (autosave debounce)

- **Where:** `src/state/app-state-store.ts:191-203` (`pinFrame` and `setRecent` write via `scheduleAppStateSave`) → `src/persistence/autosave.ts:119-126` (`APP_STATE_DEBOUNCE_MS` debounces; the controller does not publish a `app_state_changed` event until the save resolves).
- **User experience:** User pins frame X in tab A, switches to tab B (already on Home). Tab B does not reflect the pin until the autosave debounce elapses (5s idle, 30s max) AND the cross-tab `app_state_changed` event fires AND the listener at `app-state-store.ts:291-298` re-reads from disk. In practice, multi-tab is non-deterministic and the user sees stale UI for several seconds.
- **Details:** Cross-tab handlers cover `frame_deleted` and `session_deleted` immediately (`app-state-store.ts:280-290`, `:299-303`) but pin/recents go through the debounced AppState save. The audit prompt specifically flagged "Multi-tab consistency — if user pins on tab A, does tab B reflect it?" — the answer in the current code is "eventually, with multi-second delay, and only after a write round-trip succeeds."

### 11. No `is_loading` indicator on first paint — flash of empty/wrong content

- **Where:** `src/ui/home/home-page.tsx:24-60` — the component renders the empty branch on the FIRST render because `frames` is `[]` (initial store state) before the `useEffect` at `:40-42` even queues the load.
- **User experience:** Returning users see a brief flash of "No frames yet" before their actual frames pop in. Even worse if their network is slow: the empty-state CTA buttons render and could be clicked before the real data loads, racing into the wizard or the tutorial creation.
- **Details:** The store exposes `is_loading` (`app-state-store.ts:99`, `:129`) but Home never reads it. The store also exposes `is_loaded` (`:100`), the load-once gate set by `loadAppState`, but Home does not gate the empty-state rendering on either. `AppRoutes` at `src/ui/app-routes.tsx:50-51` waits for `is_loaded` (AppState) but not for `frames` to load — those are independent fetches.

### 12. `onTogglePin` re-throws non-cap errors into React's error boundary

- **Where:** `src/ui/home/home-page.tsx:120-132` — the catch only handles `PinnedCapReached`, then re-throws.
- **User experience:** Although the implementation today is synchronous and only throws `PinnedCapReached` (`app-state-store.ts:172-192`), any future store change that throws differently — or a future `scheduleAppStateSave` that throws synchronously due to bad input — will crash the entire Home page into the nearest error boundary. The user sees a generic error UI in place of their grid because a single pin click misfired.
- **Details:** The comment at `:130` even predicts this: "throw err". There is no try/catch in the call-site of pinFrame that limits blast radius. A synchronous throw from inside an event handler propagates to the React error boundary; there is no localized fallback. The user has no way to recover other than reloading the page.

### 13. `setRecent` is fire-and-forget; navigation does not wait for it to be visible

- **Where:** `src/ui/home/home-page.tsx:62-65` (`onOpen`), `:111-112` (run-argument success), `:150` (tutorial success), `:172` (wizard success). All four follow the pattern "setRecent then immediately navigate".
- **User experience:** If the user is interrupted (closes tab, presses Back) between the in-memory write and the next render of Home, the recents list update may never be persisted — `scheduleAppStateSave` debounces 1s and the tab can close before the flush. On return, the frame they just opened does not appear in Recents.
- **Details:** `pinFrame` / `setRecent` push to autosave with the same debounce as bulk edits (`autosave.ts:119-126`). The autosave controller has no `flushOnBeforeUnload` for AppState. Navigation via `window.location.hash` (`routing.ts:88-92`) triggers route change immediately, then the page unmounts. There's no `await flushAppState()` before navigate.

### 14. Title fallback bypasses the empty-title accessibility name

- **Where:** `src/ui/home/frame-summary-card.tsx:117` (`{summary.title || "Untitled frame"}`) plus the `<article role="button">` at `:64-68` has no `aria-label` or `aria-labelledby`.
- **User experience:** Screen reader users with a frame whose title is genuinely empty hear "button" with no name when focus lands on the card — only after they navigate into the inner `<h3>` do they hear "Untitled frame". The visible "Untitled frame" text is inside the `<h3>` and not exposed as the card's accessible name.
- **Details:** The card has `role="button"` but the accessible-name computation for a button without `aria-label` falls back to its text content, which the inner heading provides. That works, but the heading is two levels deep behind the inline IconButton; SRs that announce inner buttons first may give confusing order. The card also lacks `aria-describedby` pointing at the timestamp / mode chip.

---

## MEDIUM

### 15. `relativeTime` does not tick — stays "5s ago" until the next re-render

- **Where:** `src/ui/home/frame-summary-card.tsx:189` (`{relativeTime(summary.updated_at)}`) and `src/ui/primitives/relative-time.ts:12-21` (a one-shot pure function with no ticker).
- **User experience:** A user opens Home, sees "2s ago" on a recently-updated frame, then lets the tab sit. After five minutes, the chip still reads "2s ago" — the only thing that updates relative time is something else causing a parent re-render (a pin, a new frame, a wizard close). The Home page does not subscribe to any interval.
- **Details:** No `setInterval` or `requestAnimationFrame` updates the rendered string. By contrast, "Linear/Notion-style" relative timestamps tick once a minute. The README's claim at `relative-time.ts:9-10` ("Use this everywhere the UI shows a 'last updated' / 'created at' relative stamp") implicitly accepts staleness as a price for purity, but the user-visible effect is misleading on long-idle tabs.

### 16. `pinned_set` / `by_id` Map rebuilt on every render with no memoization

- **Where:** `src/ui/home/home-page.tsx:44-52` (`new Map`, the two for-loops, `new Set`).
- **User experience:** Not directly visible to the user, but every Zustand notification — pin click, recents update, wizard close, any unrelated store change — forces a full O(frames + pinned + recents) rebuild of these structures, plus rebuilds the pinned/recents arrays. For users with many frames, this means each pin click costs O(n) work in addition to React's diff.
- **Details:** None of the derivations use `React.useMemo` keyed on the relevant inputs. Since `frames`, `recents_ids`, `pinned_ids` are each independently store-subscribed and likely to change one-at-a-time, memoizing each derivation would avoid spurious recomputation.

### 17. Pin-cap toast pile-up on repeat unpin attempts

- **Where:** `src/ui/home/home-page.tsx:126-128` (`toast.push({ kind: "warning", message: err.message })`) → `src/ui/primitives/toast.tsx:63-75` (push appends to the array; no dedup).
- **User experience:** A user who is at the 8-pin cap and clicks Pin on five different frames in quick succession sees five identical "You can pin up to 8 frames…" toasts stack up at the bottom-right of the screen, each visible for 6 seconds.
- **Details:** The toast provider has no de-duplication by message or kind. The cap message contains no per-frame distinguishing info; every overflow click yields a verbatim repeat. The stack-up at `toast.tsx:127-129` simply maps every entry.

### 18. Hidden ★/☆ span is redundant with `aria-pressed`

- **Where:** `src/ui/home/frame-summary-card.tsx:132-148` — a visually-hidden span containing `★` or `☆`, in addition to the visible UIcon star, on a button whose `aria-pressed={is_pinned}` is set by `IconButton` (`src/ui/primitives/icon-button.tsx:92`).
- **User experience:** Screen readers announce both the visually-hidden glyph and the `aria-pressed` state. The user hears something like "★ Pin frame, pressed, button" — ★ becomes a stray rune. Some SRs read the glyph verbatim ("black star"); others ignore it; the experience varies per AT.
- **Details:** `aria-pressed` is the canonical pattern for a toggle. The visually-hidden span dates back to before `aria-pressed` was added on `IconButton`. The unicode characters are also a poor fallback because they substitute for accessible text, not for the icon font (which is `aria-hidden`).

### 19. Pin visual differentiation is opacity-only (low contrast)

- **Where:** `src/ui/home/frame-summary-card.tsx:127-131` — `is_pinned ? <UIcon name="star" size={14} /> : <UIcon name="star" size={14} style={{ opacity: 0.35 }} />`. Identical icon, identical color, 0.35 opacity is the only difference.
- **User experience:** In bright ambient light, on a low-contrast display, or for users with reduced color sensitivity, "pinned" vs. "unpinned" reads as the same shape — a small grey star. There is no color shift, no fill/outline swap, no badge to disambiguate.
- **Details:** The IconButton wrapper has `aria-pressed` and `data-active` (`icon-button.tsx:99`), but the star is rendered as the same UIcon name in both states. WCAG 1.4.11 ("Non-text Contrast") requires 3:1 ratio for state indicators; an opacity-only signal is close to the floor.

### 20. Dialog backdrop click bypasses `onCancel`, calls `onClose` directly

- **Where:** `src/ui/home/home-page.tsx:333-349` (Dialog's `onClose={() => setWizardOpen(false)}`) and `src/ui/primitives/dialog.tsx:100`, `:207-213` (`dismiss_on_click_outside` defaults to `true`, the backdrop click fires `onClose`).
- **User experience:** The wizard has its own Cancel button (`new-frame-wizard.tsx:169-171`) which calls `props.onCancel`. Clicking outside the dialog skips that path entirely and goes through `setWizardOpen(false)` instead. Today the two paths do the same thing, but the asymmetry is latent: if the wizard later grows an unsaved-warning prompt on Cancel, the backdrop click will silently bypass it.
- **Details:** Most production dialogs route both paths through the same handler. The Dialog primitive does not pass an event/reason argument to distinguish dismissal modes. The user has no way to tell the wizard "I want to keep editing" once they've clicked outside.

### 21. Wizard `key={String(wizard_open)}` comment is misleading (latent maintainability)

- **Where:** `src/ui/home/home-page.tsx:339-348` — the comment claims the key is needed because "the wizard's internal useState survived the Dialog's open/close cycle".
- **User experience:** None today — the wizard does reset when re-opened. But the explanation is incorrect: the Dialog primitive at `src/ui/primitives/dialog.tsx:189` returns `null` when `phase === "closed"`, so it fully unmounts, which alone would clear the wizard's state. The key is unnecessary.
- **Details:** A reviewer reading the comment is led to believe the Dialog leaks state across open/close, which it does not. The `key={String(wizard_open)}` toggles between `"true"` and `"false"`, which forces remounts on both open AND close — extra unmount/mount work for no benefit. This will mislead the next person to touch the Dialog primitive.

### 22. Card grid `minmax(240px, 1fr)` overflows when container < 240px

- **Where:** `src/ui/home/home-page.tsx:288` (pinned grid) and `:312` (recents grid) — both use `repeat(auto-fill, minmax(240px, 1fr))`.
- **User experience:** On a narrow viewport (mobile portrait, side panel open at a high split), the grid track's minimum-content size (240px) exceeds the container width, causing horizontal scroll on the entire `<section>`. The card also sets `minWidth: 220` directly (`frame-summary-card.tsx:86`), reinforcing the overflow.
- **Details:** `auto-fill` with a hard 240px min does not gracefully collapse; CSS has no built-in clamp here. The page container at `:181-189` has `maxWidth: "1200px"` but no responsive lower bound. There's also no `@media` breakpoint to switch the grid to a single column.

### 23. `wordBreak: break-word` does not break ultra-long single words

- **Where:** `src/ui/home/frame-summary-card.tsx:113` — `wordBreak: "break-word"` on the `<h3>` title.
- **User experience:** A user pastes a long URL as a frame title (genuinely common when capturing a case citation reference) and the title overflows the card, pushing the IconButton off-screen or breaking the layout. The 2-line `-webkit-line-clamp` (`:110-112`) clips vertical overflow but does nothing for horizontal overflow caused by an unbreakable token.
- **Details:** `word-break: break-word` is a deprecated alias whose modern equivalent is `overflow-wrap: anywhere`. Standard `word-break: break-word` only fires when a normal word break point exists in the text; a 200-character token with no spaces or punctuation will not break.

### 24. Tutorial button missing `aria-busy` while loading

- **Where:** `src/ui/home/home-page.tsx:219-228` and `:259-268` — the tutorial Button passes `disabled` and a leading Spinner but no `aria-busy="true"`.
- **User experience:** Screen reader users hear "Loading tutorial…, button, dimmed" but no async-busy signal. The `<Spinner>` is announced as a status region (`loading-screen.tsx:55-67` uses `role="status"`), but the button itself reports "disabled" rather than "in progress". Two semantically different states ("button is intentionally blocked" vs "button is doing the thing you asked").
- **Details:** The Run-argument button at `frame-summary-card.tsx:175` does set `aria-busy={run_argument_pending ? "true" : undefined}`. The tutorial CTA does not, even though both share the same Spinner pattern. Inconsistent with the design's own precedent.

### 25. Tutorial loading state has no hung-request timeout

- **Where:** `src/ui/home/home-page.tsx:134-161` — `setTutorialLoading(true)` is cleared only in the `finally` block when the promise settles.
- **User experience:** If `createTutorial`'s Supabase request hangs (slow network, half-open connection), the user sees "Loading tutorial…" indefinitely with no progress, no cancel, no error. They can't tell whether to wait or reload.
- **Details:** No client-side timeout on `createTutorial`, no `AbortController`, no progress feedback. The `tutorial_loading` flag has no max-wait fallback. The header tutorial button and the empty-state tutorial button both gate on the same flag (`:224`, `:264`), so both stay frozen.

### 26. Tutorial residue in sessionStorage after user bails

- **Where:** `src/tutorial/create-tutorial.ts:30-56` (`saveTutorialRoleMap` writes; no automatic clear on tutorial bail) and `src/ui/tutorial/tutorial-phase.ts:8-27` (the phase is sessionStorage-backed).
- **User experience:** User starts the tutorial, navigates back to Home, opens an unrelated frame. The `argmap.tutorial.role-map.v1` and `argmap.tutorial.phase.v1` keys persist in sessionStorage. If they then reopen the tutorial frame, the tour anchors may try to find nodes by stale id (since `createTutorial` overwrites on every new tutorial run but stale ids remain referenced if the tutorial frame was deleted manually).
- **Details:** `clearTutorialRoleMap` exists (`create-tutorial.ts:53-56`) but is never called from the Home page or the bail path. The phase tracker has no "user bailed" transition; the phase stays armed across navigations within the tab.

### 27. `onRunArgument` does not pre-load the FrameVersion in the existing-session path

- **Where:** `src/ui/home/home-page.tsx:75-110` — if `existing[0]` is found, the navigate fires immediately without verifying the parent frame or its version are loadable.
- **User experience:** If the existing session's `frame_version_id` references a Frame/FrameVersion that was deleted from another device (or RLS prevents read), the user lands on the argument-running page which then errors out. The Home page would have failed earlier with a recoverable toast; instead the user gets a broken page.
- **Details:** The create-path (`:77-109`) is defensive: it calls `loadFrame` + `loadFrameVersion` before the writes. The reuse-path (`:76`) only reads `existing[0].id` and trusts everything else. Asymmetric defensiveness.

---

## LOW

### 28. Run-argument label "Run argument" is ambiguous in mode-flavor context

- **Where:** `src/ui/home/frame-summary-card.tsx:179` — the visible label is "Run argument".
- **User experience:** For a general-mode personal frame, "Run argument" reads as off-tone; the architecture distinguishes Frame-Building from Argument-Running modes, but the colloquial usage in legal vs. academic/personal contexts differs. A law student understands the term; a user using the app for analytical personal questions may parse "argument" as the lay meaning.
- **Details:** The aria-label at `:174` is "Open an argument session for this frame" — the more precise phrasing — but the visible text is the shorter one. The chip on the same card may say "General · Personal" while the button says "Run argument", which feels disjointed.

### 29. Pin button absolute-positioned hidden span uses `clip` (deprecated)

- **Where:** `src/ui/home/frame-summary-card.tsx:132-148` — uses the older `clip: "rect(0 0 0 0)"` rather than the modern `clip-path` pattern.
- **User experience:** None directly. The `clip` property has been deprecated in favor of `clip-path` since CSS Masking. The current implementation still works in all browsers.
- **Details:** Cosmetic / future-proofing concern. The other visually-hidden uses in the codebase may use the same idiom; this should be a primitive (`<VisuallyHidden>`) rather than re-implemented inline per call site.

### 30. Empty-state title "No frames yet" doesn't acknowledge tutorial presence

- **Where:** `src/ui/home/home-page.tsx:19-22` (`EMPTY_COPY.title = "No frames yet"`).
- **User experience:** After the tutorial is created, the user goes back to Home — the empty state no longer fires because the tutorial frame is in recents. But if the user deletes the tutorial frame and has nothing else, "No frames yet" reappears. The copy doesn't distinguish "first-time user, never created anything" from "had things, deleted them all".
- **Details:** The copy is `as const` — frozen single-string. There is no per-context variant.

### 31. Two CTA copies for "New frame" — header and empty-state — duplicate the same button definition

- **Where:** `src/ui/home/home-page.tsx:229-237` (header) and `:269-275` (empty-state).
- **User experience:** None today; the buttons behave identically. The risk is duplication drift: a future change to the header button (variant, label, icon) must remember to update the empty-state one. The empty-state button has no `data-testid` (`:270`), only the header does (`:231`).
- **Details:** Identical click handler (`() => setWizardOpen(true)`), same leading icon. The empty-state version is missing `data-testid="home-empty-new-frame"` to mirror the tutorial test ID that DOES exist (`:262`).

### 32. `recents.slice(0, 20)` is also implicitly the recents store cap — silent invariant

- **Where:** `src/ui/home/home-page.tsx:316` (display slice) and `src/state/app-state-store.ts:199` (store-level slice, `slice(0, 20)`).
- **User experience:** None visible because both caps are 20. If either cap drifts (e.g., spec changes to "show last 30 but store only 20"), one side will silently truncate or display blanks. The audit prompt flagged "> 20 recents" — store enforces 20 at write time so this never overflows, but the duplicated literal is a maintenance trap.
- **Details:** The Home page does not import the cap constant from the store; it hardcodes the number 20 in the JSX. No "Show more" affordance is provided when the user has hit the cap — the 21st-most-recent frame is silently dropped.

### 33. Cards inherit `minWidth: 220` even though grid track is 240 — internal misalignment

- **Where:** `src/ui/home/frame-summary-card.tsx:86` (`minWidth: 220`) vs. `src/ui/home/home-page.tsx:288` / `:312` (grid `minmax(240px, 1fr)`).
- **User experience:** None directly because the grid clamps the actual track width to 240+. The 220 minWidth on the card is a leftover from a different layout context (e.g., a flex-wrap with smaller tracks).
- **Details:** Number mismatch suggests the card was authored before the grid was tightened. Either the grid should reflect the card's true minimum, or the card's minWidth should be removed.

### 34. Pin IconButton's tooltip ("Pin" / "Unpin") differs from aria-label ("Pin frame" / "Unpin frame")

- **Where:** `src/ui/home/frame-summary-card.tsx:122-124` — `aria-label={is_pinned ? "Unpin frame" : "Pin frame"}` vs. `title={is_pinned ? "Unpin" : "Pin"}`.
- **User experience:** Tooltip-revealing pointer users see "Pin"; screen reader users hear "Pin frame". Two truths in the UI for the same control; the verb-only tooltip is awkwardly terse hovering a card.
- **Details:** Inconsistency with the visual chrome elsewhere. The IconButton default at `icon-button.tsx:94` is `title ?? aria-label`, so omitting `title` would auto-match.

---

## POLISH

### 35. 2-line clamp relies on `-webkit-box` with no standard fallback

- **Where:** `src/ui/home/frame-summary-card.tsx:109-112` — `display: "-webkit-box"`, `WebkitLineClamp: 2`, `WebkitBoxOrient: "vertical"`.
- **User experience:** All shipping browsers in 2026 support `-webkit-line-clamp`, but the syntax is non-standard. The standard `line-clamp` property exists in some browsers as well and isn't used as a co-fallback.
- **Details:** Long-term acceptable; flagging for awareness.

### 36. "Argument session — {frame.title}" template puts a literal em-dash in a generated title

- **Where:** `src/ui/home/home-page.tsx:88` — `title: \`Argument session — ${frame.title}\``.
- **User experience:** A user who renames their frame later sees the original frame title preserved in the session's name as snapshot text. If the frame title contained any unusual characters or quotes, they're preserved verbatim. Cosmetic.
- **Details:** Not currently editable from the Home page; the session opens with this generated name. No clear path for the user to know the name was auto-generated.

### 37. Loading-tutorial label uses Unicode ellipsis but loading-button-pending label uses ASCII three-dot pattern with em dash mismatch

- **Where:** `src/ui/home/home-page.tsx:227` / `:267` ("Loading tutorial…") vs. `src/ui/home/frame-summary-card.tsx:179` ("Opening…"). Both use proper `…` here but other surfaces in the codebase mix styles.
- **User experience:** None observed within Home itself; consistency was checked and both use U+2026.
- **Details:** Polish item: enforce typography style across the design system via a single primitive.

### 38. Section heading uses `<h2>` but the page has a `<h1>` only for the wordmark — heading hierarchy collapses semantically

- **Where:** `src/ui/home/home-page.tsx:202-212` (`<h1>argmap</h1>`) and the SectionHeading `<h2>` at `:354-365`.
- **User experience:** Screen reader heading navigation surfaces "argmap" (h1), then "Pinned" (h2), then "Recent" (h2). The h1 is a brand wordmark, not a page-title — landmark navigation is non-informative.
- **Details:** A better h1 would describe the page ("Home", "Your frames", etc.); the brand wordmark could be a `<div>` or `aria-label`-only marker.

### 39. New-frame Button uses `leading={<UIcon name="plus" size={16} />}` while Run-argument Button uses `trailing={<UIcon name="arrow-right" size={12} />}` — directional asymmetry

- **Where:** `src/ui/home/home-page.tsx:233`, `:272` vs. `src/ui/home/frame-summary-card.tsx:177`.
- **User experience:** "+ New frame" reads as "do this thing"; "Run argument →" reads as "go to next surface". Functionally fine, but the icons have different sizes (16 vs 12), which subtly shifts visual weight.
- **Details:** Size inconsistency between primary CTAs is mild visual polish.

### 40. Tutorial copy refers to "Palsgraf" without naming the case in the user-facing CTA

- **Where:** `src/ui/home/home-page.tsx:227` ("Try the tutorial") and `EMPTY_COPY.body` at `:21` ("the worked Palsgraf example").
- **User experience:** "Palsgraf" appears in the empty-state body copy without prior context. A general-mode (non-legal) user opening the app for the first time sees a legal-case proper name as the tutorial example with no hint that the tutorial works for any user. The user may infer the tutorial is legal-only.
- **Details:** The application supports both legal and general use cases (Constitution Article I). Surfacing only a legal example in the onboarding suggests bias toward the primary use case at the expense of the secondary.

---

## Tally

- CRITICAL: 5
- HIGH: 9 (findings 6–14)
- MEDIUM: 13 (findings 15–27)
- LOW: 7 (findings 28–34)
- POLISH: 6 (findings 35–40)
- **Total: 40**
