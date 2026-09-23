# Boot, Auth & Sign-in — Findings

Scope: Cold-load through "usable workspace" — `index.html` → `main.tsx` → `Root` (Supabase client) → `AuthProvider` → `AuthGate` → `SignInScreen` or `SignedInApp` → `ui/App` (error boundary, providers, routes) → `AppRoutes` (app-state boot gate, lazy chunks, Suspense). Focus on the boot/auth/first-paint flow, error and loading UX, state cleanup, hash routing under stale/preset values, and StrictMode behavior.

## CRITICAL

### Render-throwing errors before `<App>` mounts produce a blank white page
- **Where**: `src/ui/App.tsx:19` (AppErrorBoundary placement) + `src/main.tsx:156-176` (Root has no boundary)
- **User experience**: If `AuthProvider`, `AuthGate`, `SignInScreen`, or even `SignedInApp`'s `useMemo` factories throw (e.g., `createCrossTabBus` failing because `BroadcastChannel` is undefined in a Safari Private window in some configurations, or `SupabaseRepository` constructor throwing), the user sees a blank white page in production — `import.meta.env.DEV` is false, so React's default replaces the DOM with empty content. They have no Reload button and no message.
- **Details**: `AppErrorBoundary` lives *inside* `ui/App.tsx`, which is mounted only after `useAuth().user` resolves. Everything above it in the tree — `Root`, `AuthProvider`, `AuthGate`, `SignInScreen`, the `BootError`, and the `useMemo` factories inside `SignedInApp` — runs unprotected. Even after sign-in, errors thrown during `useMemo` evaluation in `SignedInApp` are not caught (those execute before `<App>` mounts the boundary).

### `loadAppState` failure is silently swallowed; app appears to boot but every save fails
- **Where**: `src/state/app-state-store.ts:108-125` and `src/ui/app-routes.tsx:50-51`
- **User experience**: If `repo.loadAppState()` throws any error other than the literal substring "AppState singleton missing" (e.g., network timeout, RLS rejection, JSON parse error, transient 500), `is_loaded` is forced to `true` with `error` set to the message string. `AppRoutes` only gates on `is_loaded`, never reads `error`, so the user lands on Home or a frame URL with an empty/stale `app_state`. No toast fires (`SaveFailureToastBridge` only listens to autosave events, not load failures). Every subsequent action (pin, dismiss, recent) calls `scheduleAppStateSave` against a default seed; if the underlying error was a permissions issue the writes keep failing. The user sees no warning until they reload and lose pinned/dismissed state.
- **Details**: The "missing singleton" branch is identified by `msg.includes("AppState singleton missing")` — brittle string matching that breaks the moment the repository changes its error message.

## HIGH

### AuthGate loading branch uses unstyled inline placeholder — flashes white text on white before any spinner
- **Where**: `src/main.tsx:85-87` (`<div style={{ padding: 24 }}>Loading…</div>`)
- **User experience**: On every cold boot, the user briefly sees a plain "Loading…" text in the top-left, then the screen jumps to either the SignInScreen card layout or a different LoadingScreen (in `app-routes.tsx:51`). There are three different "loading" visuals in the boot path with different layouts: this raw `<div>`, the centered `SignInScreen` Loading state (sign-in-screen.tsx:52-90, which is dead code — see below), and the `LoadingScreen` primitive (`primitives/loading-screen.tsx`). Each transition is a visual jolt.
- **Details**: The placeholder also reads "Loading…" but the user has no clue *what* is loading — auth resolution against Supabase can take 1-3 seconds on a cold start (network call to refresh the session).

### SignInScreen's loading branch is dead code; users on slow networks see no progress affordance
- **Where**: `src/ui/auth/sign-in-screen.tsx:52-90`
- **User experience**: The `loading` branch is meant to show a centered "argmap" wordmark + Spinner + "Loading your workspace…" line. But `AuthGate` (`main.tsx:84-87`) gates on `loading` first and returns its own raw `<div>` before `SignInScreen` ever renders. The polished loading screen never paints. The `data-testid="sign-in-loading"` element is unreachable in production.
- **Details**: This is wasted work that contradicts the visible UX during auth resolution.

### Pending autosave debounce is lost on session expiry / external sign-out
- **Where**: `src/main.tsx:117-140` (cleanup) and `src/ui/auth/auth-context.tsx:44-46`
- **User experience**: User edits a frame; before the 5s idle / 30s cap fires, their access token expires *or* they sign out in another tab (or admin invalidates their session). `onAuthStateChange` delivers `SIGNED_OUT`, `setSession(null)` fires, `AuthGate` swaps to `SignInScreen`, which unmounts `SignedInApp`. The cleanup useEffect at `main.tsx:135-139` only removes window listeners — it does **not** call `autosave.flushAll()` on unmount. The pending patch is dropped. User signs back in and the last 5-30 seconds of edits are gone.
- **Details**: Compare to `SignOutButton` in `src/ui/chrome/sign-out-button.tsx:24-29` which *does* flush before signing out — but only when the user uses that specific button. External invalidation has no flush path.

### State stores leak on remount when `<SignedInApp key={user.id}>` swaps users
- **Where**: `src/state/app-state-store.ts:269-313`, `src/state/frame-store.ts:157-196`, `src/state/session-store.ts:218-266` — `dispose()` exists but is never called
- **User experience**: When a user signs out and a different user signs in (same browser, same tab), `SignedInApp` remounts because of `key={user.id}`. New `frame_store`, `session_store`, `app_state_store` are created with their own crosstab subscriptions. The previous stores' `unsub_frame_deleted` / `unsub_app_state_changed` / `unsub_session_deleted` handlers are never invoked — they hold references to the prior closures, prior `store.setState`, prior repository. Cross-tab events from peers now fire **two** handlers, one mutating a dead store, one mutating the live one. With each user switch the count compounds. Memory grows and, more practically, peer messages may trigger writes via the leaked `loadAppState` which then writes against the *new* repository under the new user_id, polluting the new user's recents/pinned with stale loaded state.
- **Details**: `grep` for `frame_store.dispose|session_store.dispose|app_state_store.dispose` across the project returns zero call sites. The unsubscribe wiring is allocated but never released.

### Hash routing is silently truncated to "home" when the skip-to-content link is used
- **Where**: `src/ui/app-routes.tsx:124` (`<a href="#main">`) + `src/ui/routing.ts:15-25` (`routeFromHash`)
- **User experience**: User is editing a frame at `#/frame/abc123`. They press Tab from the URL bar to reveal the skip link and press Enter / Space. The browser sets `window.location.hash = "#main"`. `hashchange` fires. `routeFromHash("#main")` does not start with `#/frame/` or `#/session/`, so it falls through to `{ kind: "home" }`. The user is yanked out of frame-building and lands on Home. Their work is auto-saved but the navigation is unexpected — they wanted to focus the main content area, not navigate. The intended WCAG accommodation breaks the URL contract.
- **Details**: Hash-based router conflates same-page anchors with route paths. Anyone clicking any anchor with `href="#…"` (not just the skip link) will hit this trap.

### `detectSessionInUrl: true` + hash routing creates ambiguity for OAuth/magic-link callbacks
- **Where**: `src/supabase-client.ts:47` plus `src/ui/routing.ts:46-48`
- **User experience**: After a magic-link callback or OAuth redirect, the browser lands on `https://<app>/#access_token=…&refresh_token=…&type=magiclink`. Supabase's `detectSessionInUrl` parses these from the hash and then typically clears it. But `RouterProvider`'s initial state (`routing.ts:46-48`) reads `window.location.hash` once at mount — depending on whether that runs before or after Supabase clears the hash, the user may land on `{ kind: "home" }` (if the hash was already cleared) or on a misparsed route. In Vite dev with React.StrictMode, the double-mount runs the read twice with potentially different values. Behavior is timing-dependent.
- **Details**: There's no magic-link issuance UI today (sign-in-screen.tsx is password-only and "Forgot password?" is intentionally absent per the comment at line 202-205), so this is latent until magic-link or OAuth is wired in — but `detectSessionInUrl: true` is already set, so any hash-rooted social provider callback will hit this.

## MEDIUM

### Stale frame URL after sign-out leaves user "stuck" on Home even with the original URL in the address bar
- **Where**: `src/main.tsx:83-92` (AuthGate) + `src/ui/routing.ts:46-48`
- **User experience**: User has bookmarked / been linked to `#/frame/abc123`. They aren't signed in. AuthGate shows SignInScreen — fine. After they sign in, `SignedInApp` mounts, `AppRoutes` boots, and the hash is *still* `#/frame/abc123`, so `FrameBuildingPage` mounts. But if `abc123` doesn't exist (different user's frame, deleted, or stale link), `frame_store.loadFrame` throws and `frame-store.ts:65` sets `error` to "Frame not found: abc123". Whether the UI surfaces this gracefully depends on `FrameBuildingPage`'s render path — and the user's URL bar still reads `#/frame/abc123`, which is misleading. No automatic redirect to home.

### `BootError` for missing Supabase env vars is functional but tells the user about Vercel even on local dev
- **Where**: `src/main.tsx:165-169`
- **User experience**: Local dev users who forgot to copy `.env.local` see a red banner saying "Install the Supabase Vercel marketplace integration (see SETUP.md)". The hint is misleading for a local-dev case — the user isn't deploying to Vercel, they just need to set the env vars. The error message from `SupabaseConfigError` (`supabase-client.ts:23-26`) does mention `.env.local` but the hint at `main.tsx:165` only mentions Vercel.
- **Details**: BootError uses inline styles (correct) since `tokens.css` is loaded transitively via `ui/App.tsx` — but `BootError` paints *before* `ui/App` if Supabase init fails, so inline-only styling is necessary. The inline styles are reasonable but only resemble the app branding faintly (no "argmap" wordmark, generic fonts).

### `getSupabaseClient()` is called from `Root` on every Root re-render
- **Where**: `src/main.tsx:159` (inside `Root` function body) + `src/supabase-client.ts:34-51`
- **User experience**: No direct user-visible bug because the client is cached behind `_client`. But the env var check (`missing` array build, branch logic) runs on every render of Root. In React StrictMode the development double-mount runs it twice. Fine in practice; flagged for completeness.

### `AuthProvider`'s `getSession` promise resolution is discarded on StrictMode double-mount
- **Where**: `src/ui/auth/auth-context.tsx:35-52`
- **User experience**: In development with StrictMode, the first effect mount fires `client.auth.getSession()`, cleanup sets `cancelled = true` and the response is dropped. Second mount fires `getSession()` again. Two Supabase auth requests per cold load in dev (none in prod). Not user-visible in prod; in dev it doubles auth requests and may show an extra "Loading…" frame.

### Sign-in error messages surface raw Supabase strings verbatim
- **Where**: `src/ui/auth/auth-context.tsx:56-58` + `src/ui/auth/sign-in-screen.tsx:38-40`
- **User experience**: A wrong password produces "Invalid login credentials" — fine. But rate-limit errors come through as "For security purposes, you can only request this after 23 seconds." and unconfirmed-email errors as "Email not confirmed". These are user-facing but feel database-generated; there's no translation layer. There's also no specific guidance when a user signs up with an email that already exists (Supabase returns "User already registered" verbatim).

### `SignInScreen` mode toggle re-enables the email/password inputs while a previous request is still in flight
- **Where**: `src/ui/auth/sign-in-screen.tsx:241-262`
- **User experience**: User clicks "Don't have an account? Create one." while a sign-in request is mid-flight. The mode flips to `sign_up`, `error` is cleared, `signup_success` is cleared — but `busy` from the in-flight signIn promise is still true. If they re-press submit, `onSubmit` re-enters with `mode = "sign_up"`, calls `signUp` (the prior `signIn` promise resolution still triggers a delayed `setBusy(false)` / `setError`). Race between the two outcomes — could surface the wrong error on the wrong form.

### Reading `import.meta.env.VITE_SUPABASE_URL` is captured at module-eval time, not on each `getSupabaseClient()` call
- **Where**: `src/supabase-client.ts:17-18`
- **User experience**: No runtime change because Vite inlines these at build time, but if a future change ever switched to runtime-loaded config (e.g., via a `/config.json` fetch), the existing pattern would fail silently. Not actionable today; noted for completeness.

### Mode-accent CSS variable not set until first `AppRoutes` render — sign-in screen renders with no `data-mode`
- **Where**: `src/ui/app-routes.tsx:69-74` (sets `documentElement.dataset.mode`) and `src/ui/styles/tokens.css:233-236` (fallback)
- **User experience**: SignInScreen runs before AppRoutes ever mounts, so `data-mode` is unset on `<html>`. The `:root` fallback supplies `--color-mode-current-accent` from `--color-mode-frame-accent`, so the sign-in card's spinner and focus rings appear in the frame-building accent color. That's a reasonable default but means a returning user whose last session was Argument Running sees a different accent on sign-in than they will see after redirect to their argument-running URL.

### `RouterProvider` initial route is computed once and never reconciled if window.location.hash changes before subscription
- **Where**: `src/ui/routing.ts:46-56`
- **User experience**: If anything mutates the hash between the synchronous `useState` initializer (line 46) and the `useEffect` that attaches the `hashchange` listener (line 50), the change is missed. Specifically, Supabase's `detectSessionInUrl` may strip auth-callback fragments from the hash during AuthProvider's mount effect — that runs after `RouterProvider`'s initializer captures the hash, but **before** the `hashchange` handler is attached. A magic-link landing could end up with the wrong cached `current` route.

## LOW

### `generateId` Math.random fallback is technically reachable on ancient browsers
- **Where**: `src/main.tsx:38-44`
- **User experience**: In an environment with no `crypto` and no `crypto.getRandomValues` (essentially impossible on any modern browser; would require Safari < 5.1 or a hostile sandbox), the function uses `Math.random`. Collision probability at session scale is negligible, but the comment "won't collide at session scale" is accurate only because session scale is small. The fallback would silently mint duplicates across users since `Math.random` is shared and predictable, which under cross-tab use could theoretically produce a collision that lands on someone else's Supabase row. Practically impossible to trigger but worth knowing.

### `BootError` doesn't include a "Reload" button or any recovery affordance
- **Where**: `src/main.tsx:46-73`
- **User experience**: User on local dev sees the red banner about missing env vars. They open their terminal, fix `.env.local`, then come back to the tab — there's no Reload button, so they have to hit Cmd+R themselves. Not a blocker (the page is broken without env vars anyway) but the AppErrorBoundary at least offers a Reload button. The two error UIs are inconsistent.

### StrictMode in development double-fires the auth subscription's `getSession` and the `useEffect` in `SignedInApp`
- **Where**: `src/ui/auth/auth-context.tsx:35-52` and `src/main.tsx:117-140`
- **User experience**: In dev only, the auth provider runs `getSession()` twice, and `SignedInApp`'s effect registers/unregisters pagehide listeners twice. Not user-visible in prod; only relevant for devtools-watching the console. The cleanup is correct, no leak.

### `AuthGate`'s "Loading…" placeholder uses `padding: 24` only — text appears at top-left rather than centered
- **Where**: `src/main.tsx:85-87`
- **User experience**: Reads as broken/half-rendered for ~500ms-1s rather than as a deliberate loading state. Compare to `LoadingScreen` (centered, branded) which is used elsewhere.

### `SignedInApp`'s `useEffect` cleanup doesn't flush autosave on normal unmount
- **Where**: `src/main.tsx:135-139`
- **User experience**: If a parent re-renders `SignedInApp` (e.g., a hot module replacement in dev, or a future change that adds a key dependency), the cleanup removes listeners but skips flushing. Same root cause as the session-expiry HIGH finding but lower severity in normal operation since the user doesn't typically unmount SignedInApp.

### `crypto.randomUUID` fallback chain not wired into a single utility shared with the repos
- **Where**: `src/main.tsx:23-44`
- **User experience**: `generateId` is defined in `main.tsx` and threaded through props. If any other module (e.g., `supabase-client.ts` for an internal ID generation, or a test helper) calls `crypto.randomUUID` directly without the same fallback, those call sites would throw on an older browser even though `generateId`'s fallback exists. Not boot-blocking but a consistency concern.

### Skip-link copy is "Skip to main content" but the target hash is `#main` (collides with route hashes)
- **Where**: `src/ui/app-routes.tsx:124` + `src/ui/routing.ts:15-25`
- **User experience**: Documented in the HIGH finding above. Listed here as a related lower-priority note: the link text is correct semantically; the routing implementation breaks it.

### `BootError` red banner uses hard-coded hex colors `#fee2e2` / `#dc2626` rather than tokens
- **Where**: `src/main.tsx:48-72`
- **User experience**: This is intentional (tokens may not be loaded if Supabase init throws extremely early), but the result is a banner that doesn't match the rest of the app's error styling (the `AppErrorBoundary` uses tokens). Two error UIs with different colors.

### Toast push from `SaveFailureToastBridge` for app-state save failures will not appear if AppState load itself failed
- **Where**: `src/ui/save-failure-toast-bridge.tsx:19-37` + `src/state/app-state-store.ts:108-125`
- **User experience**: `SaveFailureToastBridge` only handles `save_failed` events from `autosave`. If `repo.loadAppState()` returns an error other than the missing-singleton case, the error is stored in `app_state_store.error` and never surfaced — see CRITICAL #2 above. Listed here because the bridge is the user's only visibility into persistence failures, and it has this gap.

## POLISH

### "argmap couldn't start" headline in BootError doesn't match the app's voice/typography
- **Where**: `src/main.tsx:62-64`
- **User experience**: Uses `system-ui, sans-serif` and the title is lowercase "couldn't" with no app-branding context. Reads as a stack-trace ancestor rather than a branded surface. Acceptable for a fatal config error but inconsistent with the rest of the app's polish.

### Sign-in-screen comment claims `tokens.css` is imported by `main.tsx`
- **Where**: `src/ui/auth/sign-in-screen.tsx:13-15`
- **User experience**: Not user-visible. Documentation drift: tokens.css is actually imported transitively via `src/ui/App.tsx:10`, which is statically reachable from `src/main.tsx:6` through `src/App.tsx:2` and `src/ui/index.ts:1`. CSS side-effect imports are hoisted at module evaluation, so the variables are defined at first paint as the comment promises — but the import chain stated in the comment is wrong.

### "Forgot password?" intentionally absent — but no breadcrumb for users who arrive expecting it
- **Where**: `src/ui/auth/sign-in-screen.tsx:202-206`
- **User experience**: A user who forgets their password has no path forward in the UI — they have to email support or guess. The comment acknowledges this as a deliberate omission ("shipping a dead link reads as cheap") but the silent absence is itself a UX gap.

### Sign-in-screen's "Create your argmap account" subhead changes the description text, which can shift layout
- **Where**: `src/ui/auth/sign-in-screen.tsx:135-148`
- **User experience**: Toggling between sign-in and sign-up modes swaps the heading and a multi-line description. The card grows/shrinks slightly, causing micro-layout jitter. Minor.

### Spinner aria-label is hard-coded "Loading" — does not change with context
- **Where**: `src/ui/primitives/loading-screen.tsx:55-66`
- **User experience**: Screen readers will hear "Loading" both for the sign-in-screen variant and for the app-routes boot variant, even when the visible label differs ("Loading your workspace…" vs "Loading…"). Minor a11y inconsistency.
