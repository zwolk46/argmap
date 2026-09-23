# Audit 16 — Performance, cross-cutting & misc

Scope: bundle / chunk shape, render perf, async / cleanup, console hygiene, error-reporting gaps, doc-vs-code drift, dead code, tutorial bot, configuration. Grouped by theme. Severity buckets: HIGH (real user impact), MED (avoidable cost / latent bug), LOW (polish, hygiene, drift).

Build inspected: `dist/assets/index-DOOsBXlX.js` 1.77 MB, `pages-uxWhlXdF.js` 293 KB, `vendor-xyflow-DzIuKYOF.js` 318 KB, `vendor-supabase-DQh0Fvtg.js` 202 KB, `vendor-react-DWJQbeYM.js` 179 bytes (sic), `elk-worker-DGfUF0bo.js` 1.41 MB.

Numbering: F-01 … F-30 (intentionally not `P0-N` — see F-22 about leaked audit-code references).

---

## A. Bundle shape — splitting is mostly dysfunctional

### F-01 (HIGH) — `vendor-react` chunk is 179 bytes; React is bundled into `vendor-xyflow`

`vite.config.ts:15-29` declares `"vendor-react": ["react", "react-dom", "react-dom/client"]` separately from `"vendor-xyflow": ["@xyflow/react"]`, expecting React to land in its own chunk. The actual `dist/assets/vendor-react-DWJQbeYM.js` (179 B) contains only this:

```
import{r as o}from"./vendor-xyflow-DzIuKYOF.js";var r={},t;function i(){if(t)return r;t=1;var e=o();return r.createRoot=e.createRoot,r.hydrateRoot=e.hydrateRoot,r}export{i as r};
```

`grep -c "createElement\|useState\|useEffect" vendor-xyflow-DzIuKYOF.js` returns 9 hits; the same on `index-DOOsBXlX.js` returns 2. React got hoisted into `vendor-xyflow` because `@xyflow/react` is listed in the same chunk graph and Rollup's manual-chunks resolver moved the shared deps under the bigger module. The stated cache-stability benefit ("a TS-only change doesn't invalidate React") is unrealized — vendor-xyflow now invalidates whenever the React chunk would, and vice-versa, because they're physically the same chunk.

User impact: every cold load downloads + parses xyflow (318 KB) even on the Home page where xyflow is never rendered. Re-deploys that touch xyflow invalidate the React cache.

### F-02 (HIGH) — `vendor-xyflow` is `modulepreload`ed on every page including Home

`dist/index.html:28` emits `<link rel="modulepreload" crossorigin href="/assets/vendor-xyflow-DzIuKYOF.js">` unconditionally. Combined with F-01 (React is inside vendor-xyflow), this means Home-page first-paint downloads, parses, and warms a 318 KB chunk just to reach `<HomePage>` which renders zero canvas content.

### F-03 (HIGH) — ELK is in the main 1.77 MB bundle, not lazy

`grep -c "elkjs" dist/assets/*.js` shows `elkjs` is bundled only into `index-DOOsBXlX.js` (7 hits). The route-level `React.lazy(() => import("./pages"))` in `src/ui/app-routes.tsx:19-30` correctly defers the page modules into `pages-uxWhlXdF.js`, but the import graph leaks ELK into main because `src/ui/index.ts:6` does `export * from "./canvas"`, and `src/ui/canvas/index.ts:10` re-exports `useLayoutResult` from `layout-consumer.ts`, which `import { layout } from "@/layout"`. Anything that imports the `@/ui` barrel (and the eagerly-loaded `src/App.tsx:2` does) pulls the canvas + layout transitive graph into the eager chunk.

Result: Home page eagerly parses the layout module (which holds `elkjs`'s entry-point reference) before lazy-loading anything. The `elk-worker-DGfUF0bo.js` (1.41 MB) is correctly worker-loaded (good), but the elkjs bridge in main still costs parse time on Home.

### F-04 (HIGH) — Tutorial fixture is duplicated across `index-*.js` AND `pages-*.js`

`grep -c "Palsgraf" dist/assets/*.js` shows the 871-line `src/tutorial/fixture.ts` is present in BOTH the main chunk and the lazy `pages` chunk. The main chunk needs it because `src/ui/home/home-page.tsx:11` imports `createTutorial` at the module level (Home is eager). The pages chunk needs it because the lazily-loaded `ArgumentRunningPage` reads the tutorial role map via `src/ui/tutorial/tutorial-tour.tsx:22`. Either move the fixture behind a `React.lazy` (it's only invoked when the user clicks "Try the tutorial"), or hoist it into its own chunk so the deduplication actually happens.

### F-05 (MED) — Unused boundary code still inflates the main bundle

`@/ui` barrel re-exports the eager-loaded `App.tsx`'s indirect dependencies. The transitive graph pulls in: every primitive (`primitives/*`), every canvas module, hooks, ai-suggestion, plus types. The intended split (Home alone for first paint) is silently undone by the barrel. Fixing F-03 / F-04 requires either narrowing `App.tsx`'s direct imports OR converting `src/ui/index.ts` to type-only re-exports for the heavy surfaces.

### F-06 (MED) — `chunkSizeWarningLimit: 800` is set to hide the warning, not solve it

`vite.config.ts:31`. The default 500 KB warning would fire on `pages-uxWhlXdF.js` (293 KB after gzip the gzipped figure is below, but the raw chunk is right at the threshold) and on ELK-worker. Setting the limit to 800 buys silence but doesn't address the underlying main-chunk weight (1.77 MB → 533 KB gzip is still slow on a cold cellular connection).

---

## B. Doc / code drift — implementation history leaking everywhere

### F-07 (HIGH) — `README.md` is multiple wave-passes stale

`README.md:25` says the dev server lands on a "placeholder page". `:38-41` lists every module as `placeholder; I.3 / I.4 / ...` and says the coding phase is in progress (I.1 + I.2 complete). The actual code state: every module is built, the app is deployable, and 1641 unit tests pass. The README is so stale it actively misleads anyone (human or agent) reading it for orientation.

### F-08 (HIGH) — `tests/e2e/smoke.spec.ts` asserts `placeholder-root` testid that no longer exists

`tests/e2e/smoke.spec.ts:5-6`:

```ts
await expect(page.getByTestId("placeholder-root")).toBeVisible();
await expect(page.getByRole("heading", { name: "argmap" })).toBeVisible();
```

`grep -rn "placeholder-root"` in `src/` returns zero hits. This spec is wired into CI: `.github/workflows/ci.yml:25-37` runs `npm run build` then `npm run test:e2e`. Per Playwright config (`playwright.config.ts:13-18`), `webServer` is `npm run dev`, not the built preview — so the e2e job starts dev mode against the broken locator. **CI is failing or is being ignored on every push,** depending on whether the suite gets that far before the broken smoke turns the run red.

### F-09 (MED) — `frame-canvas.tsx:743-745` comment promises a `data-canvas-build` debug attribute that no longer exists

```
// Build signal so the user can verify the new code is actually loaded
// (HMR through structural state-management changes is unreliable in dev).
// Visible in DevTools as `data-canvas-build="2026-05-14-cb-ref-fix"`.
```

The attribute itself was removed; the comment was not. The audit prompt called this out as a known leak.

### F-10 (LOW) — `react-flow.css` import path comment in `src/canvas-harness.tsx` references older patterns

The harness file at `src/canvas-harness.tsx:18-36` carries 14 lines of preamble that describe a Maximum-Update-Depth bug that was fixed and a `2026-05-13` test fixture. The text is fine as a tombstone but reads as live documentation. Same problem as F-09 — comments locked in time.

### F-11 (LOW) — `setRecent`/`createFrame` README references at `src/ui/version-history/README.md:52, 65, 68, 79, 95, 111, 129, 136` cite "F-006", "F-022", "F-022-style", "F-006.2", "F-006.3", "F-006.4". Internal coding-session codes that mean nothing outside the chat that produced them.

### F-12 (LOW) — `setup.md:103-110` "What's NOT in v1" list does not match the codebase

Lists password reset, email change, account deletion, OAuth, realtime sync as out-of-scope. Some of those are now half-wired or partially gated (`src/ui/auth/sign-in-screen.tsx:202-205` explicitly comments out the password-reset CTA). Update or remove the list.

---

## C. Implementation history leaking into source

### F-13 (MED) — `P0-N`, `P1-N`, `P3-N`, `F-NNN` audit codes appear in ~25 source files

A sample (not exhaustive):
- `src/ui/canvas/frame-canvas.tsx:85, 91, 96, 102, 117, 148, 210, 238, 315`
- `src/ui/canvas/layout-consumer.ts:17, 64`
- `src/ui/canvas/nodes/types.ts:24, 31`
- `src/ui/canvas/nodes/node-frame.tsx:100, 108`
- `src/ui/argument-running/argument-running-page.tsx:50, 129`
- `src/ui/argument-running/interview-pane/interview-pane.tsx:55`
- `src/ui/argument-running/interview-pane/interview-filter.tsx:113, 126`
- `src/ui/argument-running/output-viewer/output-viewer.tsx:20`
- `src/ui/argument-running/output-viewer/path-overlay-tab.tsx:12, 14, 16`
- `src/ui/argument-running/item-editors/term-item-editor.tsx:55`
- `src/ui/argument-running/item-editors/interpretation-item-editor.tsx:31`
- `src/ui/argument-running/item-editors/checkpoint-item-editor.tsx:36`
- `src/ui/frame-building/cascade-delete-dialog/cascade-delete-dialog.tsx:8`
- `src/ui/frame-building/validation-drawer/dismissed-warnings.ts:10`
- `src/ui/frame-building/validation-drawer/validation-drawer.tsx:39`
- `src/ui/frame-building/left-pane/node-palette.tsx:154`
- `src/ui/save-failure-toast-bridge.tsx:7`
- `src/ui/app-routes.tsx:36, 163`
- `src/ui/home/home-page.tsx:167`
- `src/ui/session-settings/archive-delete-section.tsx:72`
- `src/state/app-state-store.ts:19`
- `src/ui/version-history/README.md:52,65,68,79,95,111,129,136`

These comments document _why_ a fix was made by referencing the original audit's enumeration, which leaks the development history into a permanent surface a reader can't decode without `AUDIT_FINDINGS.md`. Either inline the rationale or strip the codes.

---

## D. Bundle / dependency hygiene

### F-14 (LOW) — Dexie + IndexedDB repository are in the package but unused in production

`package.json:29` declares `"dexie": "^4.0.10"`. `grep -c IndexedDbRepository dist/assets/*.js` shows zero hits — Supabase replaced the IndexedDB path and tree-shaking dropped Dexie. The dep + `src/persistence/indexeddb-repository.ts` (947 lines) + `src/persistence/dexie-schema.ts` are still maintained surface that ships only in tests. Either remove (and the supporting `fake-indexeddb`, `IndexedDbRepository`, schema, ~947 LOC) or document as "test-only / future-fallback" in `src/persistence/README.md`.

### F-15 (LOW) — `@anthropic-ai/sdk` declared but no production wiring

The dep is real and `src/llm-hooks/providers/anthropic.ts` imports it. But `src/state/context.tsx:117` hardcodes `ai_hooks_enabled: false`, and no call site invokes `createProvider({ provider_id: "anthropic" })`. Result: the `@anthropic-ai/sdk` is tree-shaken out (`grep -c "@anthropic-ai" dist/assets/*.js` → 0), and every consumer of `useAiSuggestion` ends up disabled. The `src/ui/hooks/use-ai-suggestion.ts` hook is shipped, ~70 lines, but every consumer branches on `enabled: false` and hides itself. Either wire an actual provider or remove the dep + the hook + the dead UI gating to recover the surface (the hook + drawer + edit-panel are tested but never seen by users).

### F-16 (LOW) — Hand-rolled UUID v4 polyfill in `src/main.tsx:23-44`

15 lines of fallback for environments without `crypto.randomUUID`. `crypto.randomUUID` is now in every supported browser (Safari 15.4 = March 2022). Either delete the fallback (and trust the secure-context invariant) or move to `uuid` v4 which is 1 KB and battle-tested.

---

## E. Async patterns / cleanup leaks

### F-17 (MED) — `connector-handle.tsx` registers document mousemove/mouseup inside a click handler with no useEffect cleanup

`src/ui/canvas/connector-handle.tsx:65-66`:

```ts
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);
```

The listeners are removed inside `handleMouseUp`. But if the component unmounts mid-drag (peer-tab deletes the node; the canvas re-renders without the connector), the `handleMouseUp` closure never fires, the listeners stick to `document`, and they hold a reference to the captured `node_id` / `onEdgeRelease` props from a dead React render. Repeated drag-then-unmount sequences leak listeners + closures across the page lifetime. The fix is a useEffect that captures the listeners in a ref and removes them on unmount.

### F-18 (MED) — `AuthProvider` has no race guard on subsequent `client` changes

`src/ui/auth/auth-context.tsx:35-52` cancels the in-flight `getSession()` via `let cancelled`, but the listener handler at `:44` doesn't check `cancelled`, so if the parent passes a new `client` prop mid-cycle, the prior subscription's `_event, next_session` may still fire and bumps the new effect's `setSession`. In practice `client` is a singleton, so this never triggers — but the latent bug is real once a second client (e.g., test override) arrives.

### F-19 (LOW) — No `AbortController` in the codebase for long-running fetches

`grep -rn AbortController src/` returns zero hits. The Supabase client manages its own request lifecycle internally, so the practical impact is small — but any new path that uses raw `fetch` (none today) will have no abort-on-unmount story to follow.

---

## F. React rendering / perf patterns

### F-20 (MED) — `selectInterviewItems(s)` in `argument-running-page.tsx:84` returns a fresh array on every snapshot

`src/state/selectors.ts:139-149` does memoize via `WeakMap<snapshot, items>`, so identical snapshots return the same array reference (good). But the render path on `argument-running-page.tsx:85-86` does `interview_items.find(...)` to compute `recommended_next_id` on every render. That's an O(n) walk per render even when the memoized array didn't change. Wrap the `.find` in a `useMemo` keyed on `interview_items`.

### F-21 (MED) — Only 3 components use `React.memo` across 312 source files

`grep -rn "React.memo" src/` returns:
- `src/ui/frame-building/left-pane/outline-tree-row.tsx:22`
- `src/ui/version-history/version-tree-row.tsx:17`
- `src/ui/argument-running/interview-pane/interview-row.tsx:58`

Notable missing memos for high-frequency renderers:
- `src/ui/canvas/nodes/node-frame.tsx` (394 lines, renders once per node per any-canvas re-render)
- `src/ui/canvas/edges/argument-overlay-edge.tsx` (every overlay edge)
- `src/ui/argument-running/output-viewer/path-overlay-tab.tsx`
- Every `*-item-editor.tsx` (mounted/unmounted on inspector switch — would benefit not from memo but from preventing the parent's array-rebuild churn)

The canvas does its own selective reconciliation via `reconcileNodes`/`reconcileEdges` (`frame-canvas.tsx:350-382`) which is good, but downstream node components still re-render whenever the canvas's `desired_rf_nodes` memo invalidates (any frame_version, layout_result, status_map, primary_path_set, etc. change). A frame with 30 nodes pays 30 × node-frame-render on every premise edit.

### F-22 (LOW) — `useStore` selectors are cast through `any` × 3

`src/state/context.tsx:150, 160, 170` — three identical `useStore(store, (selector ?? ((s: any) => s)) as any) as Snapshot | T` patterns. With `eslint-disable-next-line` suppressions. The selector-optional overload is the contract; the implementation should be a single inner function with `<T>` properly threaded, not 3 copies of the same `any`-cast.

### F-23 (LOW) — TS strictness is not maxed out

`tsconfig.json:13` `noUncheckedIndexedAccess: false` — arrays + record accesses don't surface `T | undefined`, which masks real null paths in selectors that do `existing[0]?.id` correctly but in other code paths assume the value.

`tsconfig.json:14` `exactOptionalPropertyTypes: false` — `{ x?: number }` and `{ x?: number | undefined }` are conflated. The `change_summary` patch shape in `state/action-runner.ts` and `persistence/repository.ts` is a place this would fire.

These are warnings, not bugs, but the codebase already runs `strict: true` and would benefit from tightening incrementally.

---

## G. Console hygiene & error reporting

### F-24 (LOW) — `console.warn` lands in user devtools on every Supabase search miss

`src/persistence/supabase-repository.ts:684`:
```ts
console.warn("[SupabaseRepository.searchFrames]", error.message);
```
and `:724` for `upsertSearchIndex`. Each search-miss / save-write writes to the user's browser console. That's surface area for user concern ("why does my console show errors?") and is the kind of noise an integrator would mute in production. Either gate on `import.meta.env.DEV` or pipe into a reporting hook.

### F-25 (LOW) — `src/layout/elk-mapping.ts:165` writes ELK warnings to `console.warn`

Same pattern: end users see structural-graph warnings in their devtools. Layout warnings are for developers, not users.

### F-26 (MED) — Error boundary does not surface errors to anyone but the console

`src/ui/error-boundary.tsx:24` logs to `console.error`. No remote reporting (Sentry/Posthog/etc. are explicitly out per Stream H — confirmed by `grep -rn Sentry|posthog src/` returning zero). In production with no devtools open, an error boundary fire is invisible to the operator. The fallback UI says "Reload the application to recover. Your work is auto-saved." with no way for the user to send the error message. At minimum: a "Copy error details" button on the fallback UI so the user can paste into an email.

### F-27 (LOW) — No source maps in production

`vite.config.ts` does not set `build.sourcemap`. `dist/assets/` has zero `.map` files. A production crash from a user (or from the React error boundary's console.error in F-26) is unreadable minified output. Vite supports `sourcemap: 'hidden'` (no inline link, but the .map files are present to be uploaded to a tracker) — even without a tracker today, this is the cheap insurance.

---

## H. Configuration / deployment infrastructure

### F-28 (MED) — No `vercel.json` — no CSP, no security headers, no caching directives

`find . -name vercel.json -maxdepth 2` returns nothing. The deployed app:
- Sends no Content-Security-Policy header (any script tag injection compromises the page)
- Sends no X-Frame-Options / X-Content-Type-Options (clickjacking / MIME-sniff)
- Relies on Vercel's defaults for cache headers on `dist/assets/*` (which is fine — they're hash-named — but `/index.html` should be explicitly `no-cache` to avoid stale shell)

A minimal `vercel.json` adding CSP + `Strict-Transport-Security` + `index.html: no-cache` would close all three.

### F-29 (LOW) — `index.html` has no favicon, no OG/Twitter tags, no Apple touch icon

The only meta beyond viewport / charset / description is the font preconnect. A pasted argmap URL in iMessage / Slack / Discord renders as a bare URL. Missing favicon means the browser shows the default globe icon in tabs. For a portfolio-quality app deserving its own product identity, these are table stakes.

### F-30 (LOW) — Live e2e test embeds dev credentials

`tests/e2e/snapshot-fix-smoke.spec.ts:21-22`:
```ts
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";
```

The user's real email and a password are checked into the public repo as defaults. Even though the spec is gated on `E2E_LIVE=1`, the literals live in the repo history forever. Strip the defaults; require both env vars or skip.

### F-31 (LOW) — `.env.local` is gitignored but the project ships a working anon key in the repo's `.env.local` on disk

`.gitignore:15` correctly excludes `.env.local`. The on-disk file at `/Users/zacharywolk/zwolk/argmap/.env.local` contains a real publishable key. That's fine for Supabase (anon keys are public-by-design under RLS), but the convention should be documented: `.env.example` (committed) explicitly says "values from your Supabase project's Settings → API page" which is the right pattern. Verify the anon key in `.env.local` is the same project as `.env.example` placeholder explains — it is.

---

## I. Tutorial bot

### F-32 (LOW) — Tutorial fixture is 871 lines of inline literal data shipped to every user

`src/tutorial/fixture.ts` builds the entire Palsgraf frame in code. The fixture's _content_ (nodes, edges, premises) is plain data that could live as a `tutorial.json` Vite asset and be fetched on-demand. Right now every cold load parses 25 nodes + 36 edges + 4 premises of constructed object literals (~30 KB pre-minification) whether the user opens the tutorial or not. Combined with F-04 (double-bundling), the cost is meaningful.

### F-33 (LOW) — Long tour's anchor for the bottom-panel step targets two test-ids in one selector string

`src/ui/tutorial/tour-steps.ts:161`:
```ts
target: '[data-testid="bottom-panel-expanded"], [data-testid="bottom-panel-collapsed"]',
```

A CSS-selector list works for `document.querySelector` (returns the first match). React-Joyride uses this string as an anchor and will pick whichever the DOM offers first. Brittle if both ever co-exist (transitions, animations). The tour also lacks a "scroll the bottom panel into view" step before this anchor, so a user with the panel collapsed sees the spotlight on a 28px-tall strip.

### F-34 (LOW) — Tour cleanup on phase-flip skips clearing the role map only in the "short → continue prompt" path

`src/ui/tutorial/tutorial-tour.tsx:72-77` sets phase to `null` (joyride unmounts) but does NOT call `clearTutorialRoleMap()`. The map sits in `sessionStorage` until the user opens the long tour or dismisses. If the user closes the tab from the continue prompt, the next session boot rehydrates the long tour expecting a tutorial frame that may have been deleted in between. Fix: clear the map at the same time the phase flips to `null`, or after the dialog closes either way.

### F-35 (LOW) — `phase === null || phase === "done"` short-circuits even when the continue prompt is still showing

`src/ui/tutorial/tutorial-tour.tsx:48-51`:
```ts
if (phase === null || phase === "done") {
  if (!show_continue_prompt) return null;
}
```

The branch reads correctly but the `if` body falls through to the steps-build below, which then has `steps = null` for both phases. The render emits `null` for the Joyride conditional and the dialog conditional. Net effect: works, but reads as if a state-machine quadrant is dead. A simpler early-return chain would be more obvious.

---

## J. Misc — cumulative drift / known-but-unfixed from prior audit

### F-36 (MED) — `src/modes/orchestration.ts` (220 lines) is still dead

`grep -rn "from.*modes/orchestration"` returns zero hits. Per AUDIT_FINDINGS P0-25 the file shadows the live `runtime/extras.ts` heuristic. Not yet removed.

### F-37 (MED) — Closed `<Drawer>` still has focusable children in tab order

`grep -rn "inert=" src/` returns zero hits. Per AUDIT_FINDINGS P0-24 the fix is to add the `inert` attribute when `!open`. Not yet applied.

### F-38 (LOW) — Foreground-font CDN is fetched from `cdn-uicons.flaticon.com`

`index.html:17-25` preconnects + loads 2 stylesheets from flaticon.com's CDN. 90 `UIcon` usages across the source. Loading icons from a third-party CDN introduces a runtime dependency on flaticon.com being up + not changing the licensing model. The styles `.fi-rs-...` / `.fi-sr-...` come from those external stylesheets — if either CSS file 404s, every IconButton renders as the empty `<i>` fallback. Either self-host the two CSS files (and the font woff2s they reference) or use an SVG-icon system.

### F-39 (LOW) — `canvas-harness.html` is in the repo root but not built to `dist/`

`canvas-harness.html` lives at the repo root and is served by Vite in dev (which serves files from disk for HTML entries). It does not appear in `dist/`. The Playwright `canvas-interaction.spec.ts` (7 tests, real-DOM canvas interactions) navigates to `/canvas-harness.html`. In dev (where `webServer: "npm run dev"` per `playwright.config.ts:13-18`), this works. Against a built preview or a deployed environment, it would 404. Since CI uses `npm run dev`, the suite passes there — but the harness's purpose ("does the canvas work in a real browser") is undermined: it's being tested against dev mode with HMR + sourcemaps + StrictMode double-render, not against the production bundle's chunking. Either (a) add the harness to `vite.config.ts` as a second `build.rollupOptions.input` so it ships to dist, then change `playwright.config.ts` to `npm run build && npm run preview`, or (b) document explicitly that the harness is dev-only.

### F-40 (LOW) — `pages.tsx` re-exports include `VersionHistoryPane` etc. — version-history pulled into pages chunk

`src/ui/pages.tsx:7-19` re-exports the full version-history surface. The `pages-uxWhlXdF.js` chunk (293 KB) carries `FrameBuildingPage` + `ArgumentRunningPage` + `FramePreviewView` + `SessionPreviewView` + `OnboardingWizard` together — five surfaces that don't need to ship together. The user opens Frame Building first; they don't need preview/session-preview/onboarding code in that load.

---

## Tally

40 findings. Severity distribution: 7 HIGH, 14 MED, 19 LOW.

Highest user-visible: F-01 / F-02 / F-03 / F-04 (bundle shape — Home page eagerly parses xyflow + ELK + a duplicated 30 KB tutorial fixture), F-07 / F-08 (README + smoke test stale to a degree CI may be silently red).

Highest hidden cost: F-26 (production error boundaries fire blind), F-28 (no security headers), F-13 (audit codes leaking permanent commit-rationale into source).

Cleanest single fix: F-08 (delete or rewrite `tests/e2e/smoke.spec.ts`).
