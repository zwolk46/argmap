# Audit — Persistence Layer + Sync Behavior

**Scope:** `src/persistence/*`, `src/main.tsx` (close-flush integration),
`src/ui/save-failure-toast-bridge.tsx`, `supabase/schema.sql`, plus the
state-store consumers and the auth gate that constructs the per-user
repository.

**Severity buckets**

- **C** (Critical) — silent data loss, security, or user-visible "my edits vanished" failures.
- **H** (High) — meaningful brokenness in advertised behavior, missing UX guard-rails, easy-to-hit corruption window.
- **M** (Medium) — works on the happy path but degrades under real-world conditions (slow network, large data, multi-tab).
- **L** (Low) — cleanup, tightening, doc/spec drift, test gaps.

> One finding that frames everything below: **the documented "Dexie /
> IndexedDB offline cache" does not exist in the production runtime.**
> `main.tsx` constructs a `SupabaseRepository` only. `IndexedDbRepository`
> is referenced exclusively by tests. The audit prompt's "IndexedDB
> fallback" assumption is incorrect for this build. Several findings below
> are consequences of that.

---

## C-1. No IndexedDB fallback at runtime — every keystroke goes to Supabase or is lost

**File:** `src/main.tsx:96-99` (sole repo construction); also
`src/persistence/index.ts:29` (IndexedDbRepository merely re-exported, no
consumer in `src/` outside tests).

```typescript
const repo = React.useMemo(
  () => new SupabaseRepository({ client, user_id, now, generateId }),
  [client, user_id],
);
```

The README and the audit brief both describe an IndexedDB cache. The
codebase never instantiates it in `src/`; `grep -rn "IndexedDbRepository"
src --include="*.ts" --include="*.tsx"` returns only the class
definition and the barrel re-export. Consequence:

- Working on a flaky Wi-Fi connection: every patch becomes a remote PATCH
  attempting to land within 5 s; if any one fails, the `save_failed` toast
  fires and the payload is retained in autosave's slot, but **the user
  must do another edit on the same id to re-arm the schedule** (see C-2).
- No offline mode at all. A subway ride or a brief dropped connection
  produces a stream of failed-save toasts and unsaved work.
- Title says "5 s idle / 30 s cap" — but on Supabase that's the network
  round-trip cadence, not a local-write cadence. Read latency for
  `loadFrame` / `loadFrameVersion` is also a network call on every
  navigation.

**User impact:** A law student typing a long Conclusion statement on a
hotel Wi-Fi who loses connectivity for 90 s — they keep typing past the
30 s max-timer, the network fail-toast fires, the autosave slot retains
the last payload, but no automatic retry exists. If they navigate to
another frame before typing again, the retained payload **is silently
dropped** when the state-store reloads from disk (`loadFrame` returns the
last-persisted version).

---

## C-2. Failed autosave never retried until the user edits the same id again

**Files:** `src/persistence/autosave.ts:175-187` (flushFrame catch),
`src/persistence/README.md:64` ("The next scheduleFrameSave… call for
the same id reschedules it for retry").

The catch in `flushFrame` / `flushSession` clears `in_flight` and emits
`save_failed`, but **does not re-arm any timer.** The slot stays in
`frame_slots` with its payload intact; the only way to flush it is for
the caller to call `scheduleFrameSave` again. Two consequences:

1. **No automatic retry on transient errors.** Network blip, 5xx,
   token-refresh in flight — all leave the user staring at a "Couldn't
   save" toast and the burden of remembering to touch the document
   again before navigating away.
2. **`flushAll()` on pagehide will not retry a previously-failed slot
   either** (see C-3) — `flushAll` calls `flushFrame(id)` which only acts
   if the slot still has a *fresh* in_flight=false state, but the retained
   payload at that point IS the unsaved one; one extra attempt happens but
   if it also fails (e.g., the network really is gone), the data dies with
   the tab.

The README's "next schedule… reschedules it for retry" is technically
correct, but it shifts a reliability obligation onto the human user and
the surrounding UI doesn't visibly tell them.

---

## C-3. pagehide/beforeunload "fire-and-forget" flush has no guarantee the PATCH leaves

**File:** `src/main.tsx:117-140`.

```typescript
function flushOnHide() {
  void autosave.flushAll();
}
window.addEventListener("pagehide", flushOnHide);
window.addEventListener("beforeunload", flushOnHide);
document.addEventListener("visibilitychange", flushOnVisibilityHidden);
```

`flushAll()` returns a Promise; nothing awaits it. The browser is
permitted to tear down the page as soon as the handler returns.
`@supabase/supabase-js` uses `fetch` without `keepalive: true` and
without `navigator.sendBeacon`, so:

- On `beforeunload`, the in-flight PATCH may or may not reach the wire.
- On iOS Safari (which doesn't fire `beforeunload`), `pagehide` fires but
  any pending `setTimeout`-queued microtask is killed before the PATCH
  body is serialized.
- On a tab "Close All" or browser kill, the autosave debounce window's
  contents are lost.

The comment at line 121 acknowledges this ("there's no time to await
here. Supabase's queueMicrotask gives the in-flight PATCH a chance to hit
fetch"). That's wishful — it's "best effort" in name only. No telemetry,
no last-resort write to localStorage, no UI hint to the user that "your
last few seconds of edits may not have made it."

**User impact:** Closes laptop lid 4 s after typing a checkpoint
answer; reopens an hour later; the answer is gone.

---

## C-4. SupabaseRepository "atomicity" methods are sequential client writes, not transactions

**File:** `src/persistence/supabase-repository.ts:1-19` (design notes
acknowledging this explicitly), `:421-453` (`createBlankFrame`),
`:519-593` (`migrateSession`), `:595-616` (`restoreFrameVersion`).

The Stream H "Atomicity contracts §1-§4" spec calls for atomic composite
operations. Supabase implementation hits the network 2-N times per
composite operation with no Postgres transaction or RPC wrapper. If the
network fails between calls (or the second call is rejected by RLS
because session expired), the on-server state is partially mutated:

- **`createBlankFrame`** does `saveFrame` then `saveFrameVersion`
  (`:451-452`). Failure between: a Frame row exists with
  `current_version_id` pointing at a FrameVersion that was never written.
  `listFrames()` will show a card; clicking it will throw `"FrameVersion
  not found"` because `loadFrameVersion` returns null. The frame is now
  unrecoverable from the UI (delete only path).
- **`createFrameFromTemplate`** same shape, same risk
  (`:514-515`).
- **`migrateSession`** does `saveSession` then `saveSessionVersion`
  (`:590-591`). Failure between: `frame_version_id` already points at the
  new target version, but the new session version was never persisted —
  the session row points at the OLD `current_version_id` which still
  exists, so the migration appears to fail silently except the
  `frame_version_snapshot` got swapped, producing a mismatched view.
- **`restoreFrameVersion`** / **`restoreSessionVersion`** call
  `saveFrameVersion` which itself does `frame_versions.upsert` then
  `frames.upsert` and `search_index.upsert` — 3 sequential round-trips
  per restore.

The IndexedDb implementation correctly wraps each composite in
`db.transaction("rw", [...], async () => {...})`. Supabase loses that
guarantee entirely. The class doc note at line 11-18 says "for real
atomicity we'd move them to SQL RPC functions; v1 trades that off for
developer velocity" — fair as a stated tradeoff, but the user-facing risk
window is broader than a velocity tradeoff suggests, and no UI surfaces
the partial-write outcome.

---

## C-5. Optimistic UI never rolls back on save failure — in-memory state silently diverges from disk

**Files:** `src/state/frame-store.ts:83-94` (applyPatch),
`src/state/session-store.ts:104-128` (applyPatch),
`src/state/frame-store.ts:162-166` (save_failed listener),
`src/state/session-store.ts:223-227` (save_failed listener).

```typescript
// frame-store.ts:83-94
applyPatch(patch: FramePatch): void {
  const { frame, frame_version } = get();
  if (!frame || !frame_version) return;
  const result = runFrameAction({...});
  set({
    frame: result.next_frame,            // <- in-memory mutated
    frame_version: result.next_version,  //   BEFORE scheduling save
    validation: result.validation,
  });
  autosave.scheduleFrameSave({...});
}

// frame-store.ts:162-166 — save_failed handler
const unsubSaveFailed = autosave.on("save_failed", (e) => {
  if (e.kind === "frame") {
    store.setState({ error: e.error?.message ?? "Frame save failed" });
    // <- only error string set; frame/frame_version NOT rolled back
  }
});
```

Every patch is applied optimistically. The `save_failed` listener
records an `error` message but does not roll back `frame` or
`frame_version`. Combined with C-2 (no automatic retry) and C-7
(sticky toast on every retry), the user-visible failure mode is:

1. User types a checkpoint answer → in-memory state shows the change.
2. Network blip → save fails → red toast appears, in-memory state
   still shows the change.
3. User keeps typing → more patches applied optimistically → each
   produces another failed save → toast stack grows.
4. User navigates to another page → `loadFrame` re-fetches from disk
   on return → **every keystroke since the first failure silently
   vanishes**, with no warning beforehand.

Even worse: if the user closes the tab while the in-memory state has
unsaved edits, those edits die without a "you have unsaved changes"
prompt. There is no `beforeunload`-style guard that detects
"in-memory state has diverged from last successful save" — the only
unload listener is the fire-and-forget flush in `main.tsx:117-140`
(C-3), which tries one more save and gives up.

The architectural fix is either:
- Roll back to the last-known-good `frame_version` on `save_failed`,
  or
- Maintain a "dirty since last successful save" flag, surface it in
  the UI as a banner, and refuse navigation until cleared.

Neither exists today. The bug is structurally identical to what made
Stream H's autosave debounce window risky — and the user-perception
is "I made my edits, the app said something was wrong, now my edits
are gone." This is the same outcome as data loss to a non-technical
user; differentiating it as a UX problem (vs. a persistence problem)
is not visible from the user's seat.

---

## C-6. Cross-tab broadcast leaks across users on the same browser if you sign out/in without a full reload

**File:** `src/main.tsx:102-105`, `src/persistence/broadcast.ts:3-10`.

```typescript
const crosstab = React.useMemo(
  () => createCrossTabBus(`argmap_v1__crosstab__${user_id}`),
  [user_id],
);
```

The channel name is scoped per-user. Good. **But:** when a user signs
out and a different user signs in *in the same tab*, `useMemo` on
`user_id` produces a fresh CrossTabBus, **but the previous bus's
underlying BroadcastChannel is never closed.** `useMemo` doesn't return
a cleanup; only `useEffect` does. So:

- Tab A (user `u1`) opens a frame, mints `argmap_v1__crosstab__u1`.
- Tab A signs out, signs in as `u2`, mints
  `argmap_v1__crosstab__u2`. Old channel `u1` keeps its WebKit-side
  registration; if any old listener was registered (`SessionStore`,
  `FrameStore`, `AppStateStore`), they remain subscribed to the old
  channel.
- Tab B logged in as `u1` saves a frame → broadcast on `u1` channel →
  Tab A's stale listener (still subscribed) refreshes from the (now
  `u2`-authenticated) Supabase client.

The whole `SignedInApp` is keyed by `key={user.id}` in `main.tsx:91` so
React remounts everything on user change — that mostly mitigates this in
practice, **but `crosstab.close()` is still never called.** Memory leak
+ subtle correctness risk if React ever decides to bail on the remount
(`<StrictMode>` double-invokes in dev and could mask this).

---

## C-7. SaveFailureToastBridge shows a "duration_ms: 0" sticky toast on every transient hiccup

**File:** `src/ui/save-failure-toast-bridge.tsx:34`.

```typescript
push({ kind: "error", message, duration_ms: 0 });
```

`duration_ms: 0` means the toast doesn't auto-dismiss. Combined with the
no-retry policy in C-2, a single dropped network packet leaves a
permanent red banner on screen even after the user's next keystroke
schedules the save again and succeeds. There's no `save_succeeded`
listener that dismisses prior failure toasts.

Worse, **every retry attempt fails the same flush** under sustained
outage, and each one pushes a *new* toast. After 30 s of typing through
an outage you have a stack of 6-12 identical "Couldn't save your frame:
fetch failed" toasts blocking the UI.

---

## H-8. Token refresh mid-save not handled — long sessions silently lose writes

**Files:** `src/supabase-client.ts:40-49` (`autoRefreshToken: true`),
`src/persistence/supabase-repository.ts` (any save method).

`@supabase/supabase-js` auto-refreshes the JWT, but the refresh runs on a
timer independent of in-flight requests. If a `saveFrameVersion` PATCH
fires with an expired access token, Supabase returns `401`, the client
throws, the repo wraps in `RepositoryError`, autosave emits `save_failed`,
and the user sees a toast. The next schedule MAY succeed because the
client has refreshed by then — or may also fail if the refresh itself
failed silently (no refresh-error handler in `auth-context.tsx`).

There's no proactive "if token expires in < 10 s, defer save until after
refresh" guard. For multi-hour drafting sessions this matters more than
it looks.

---

## H-9. Concurrent same-tab writes can race — no in-tab queue ordering for different ids

**File:** `src/persistence/autosave.ts:128-136` (`flushAll`).

```typescript
async flushAll(): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const id of frame_ids) tasks.push(this.flushFrame(id));
  for (const id of session_ids) tasks.push(this.flushSession(id));
  if (this.app_state_payload) tasks.push(this.flushAppState());
  await Promise.allSettled(tasks);
}
```

`flushAll` fires every flush in parallel. Within a single id this is
fine (`in_flight` guard). But two scheduled saves for two different
frames + an app_state save can land at Supabase out of order. Usually
benign — except in scenarios like:

1. User pins frame F (app_state save scheduled).
2. User deletes frame F (`deleteFrame` runs immediately, not through
   autosave — see `app-state-store.ts:149-165`).
3. App_state save lands AFTER delete completes; resurrects the pinned
   id if the AppState payload was captured before the in-store
   `.filter` ran.

`deleteFrame` does filter recents/pinned before scheduling the
app_state save (`app-state-store.ts:154-159`), so this is actually
prevented for *intentional* deletes. But the same race applies to
cross-tab `frame_deleted` events: peer Tab B deletes F, broadcasts;
Tab A's `unsub_frame_deleted` filters and re-saves app_state — but if
Tab A had a *different* app_state edit pending (just dismissed a
coachmark), that pending state still contains F in pinned/recents, and
the freshly-written next_state inside `unsub_frame_deleted` operates on
`store.getState().app_state` which won't include the in-flight pending
payload. Net effect: the unflushed in-memory dismissal can clobber the
cross-tab deletion.

The `app_state_in_flight` flag exists but doesn't protect against
cross-tab event ordering.

---

## H-10. `applyChangeSummary` is a no-op when the version already has a summary

**File:** `src/persistence/autosave.ts:300-304`.

```typescript
private applyChangeSummary(p: PendingFrameSave): PendingFrameSave {
  if (!p.change_summary) return p;
  return { ...p, new_version: { ...p.new_version, change_summary: p.change_summary } };
}
```

The intent (judging from `saveFrameMilestone` calling sites in
`frame-store.ts:99-103`) is: callers can pass a `change_summary` on the
pending payload separately from the version's own summary, and it should
be merged. But `applyChangeSummary` only triggers when
`p.change_summary` is truthy — for the *automatic* per-keystroke
debounced saves coming through `scheduleFrameSave`, `change_summary` is
undefined, so it's a pass-through. Fine.

The risk is: when a milestone is in flight and the *milestone*
change_summary is provided, the merge ALWAYS overwrites whatever was on
the version. If a downstream action-runner had already stamped a summary
on `new_version.change_summary`, it gets blown away by an
explicit-but-empty PendingFrameSave.change_summary if the caller ever
sets `change_summary: ""`. Stream H spec did not say which wins. Minor
spec drift / source of confusion.

---

## H-11. SupabaseRepository.saveFrame writes mismatched timestamps in column vs payload

**File:** `src/persistence/supabase-repository.ts:117-127`.

```typescript
async saveFrame(frame: Frame): Promise<void> {
  const { error } = await this.client.from("frames").upsert({
    id: frame.id, user_id: this.user_id,
    payload: frame,                  // <- payload.updated_at = caller's value
    ...
    updated_at: this.now(),          // <- column updated_at = wall-clock now
  });
```

If the caller passed a `Frame` whose `payload.updated_at = "2026-05-13T..."`
(stale from in-memory state) and `this.now()` is later, the column and
payload disagree by N seconds. `listFrames` uses the column to sort
(`:89`) and surfaces the column to UI (`:100`), but `loadFrame` returns
`payload` (`:114`), and the UI's `frame.updated_at` after load is the
stale payload value.

After a navigation cycle a frame can appear "fresher" in the home list
than the frame-building page reports — minor visual jitter, debugging
nightmare if you ever rely on `frame.updated_at` for staleness checks.

---

## H-12. SupabaseRepository.saveFrameVersion does NOT bump Frame.updated_at on the payload

**File:** `src/persistence/supabase-repository.ts:243-245`.

```typescript
const next_frame: Frame = { ...frame, current_version_id: to_write.id };
await this.saveFrame(next_frame);
```

The `next_frame` payload only updates `current_version_id`; the
`updated_at` field in the payload is whatever was there before. The
column gets a fresh `this.now()` (from saveFrame), but the *payload*
field doesn't. Compare with IndexedDbRepository.saveFrameVersion which
does `frame.updated_at = this.now()` before the put (`:224`). Drift
across implementations and another inconsistent source of
`frame.updated_at` truth.

---

## H-13. SupabaseRepository search_index has `tsv = null` permanently — search is a no-op

**Files:** `src/persistence/supabase-repository.ts:713-722`, `:665-696`.

```typescript
tsv: null,  // <- comment: "future migration can add a generated tsvector"
```

`searchFrames` builds a `to_tsquery`-style ts_query, calls
`.textSearch("tsv", ts_query, ...)`. Since `tsv` is always null, **every
search returns zero results** (or errors and the catch returns `[]`).
The `searchFrames` interface is implemented but inert in production.

Compounding: no UI surface actually CALLS `repo.searchFrames` (grep in
`src/ui/` returns zero results). So the broken implementation is masked
by unused code, but if a future session wires up the search modal, it
will silently return empty and the implementer will chase the wrong bug.

---

## H-14. SupabaseRepository.searchFrames swallows errors and returns []; user sees "no results found" for what's actually an outage

**File:** `src/persistence/supabase-repository.ts:681-686`.

```typescript
if (error) {
  console.warn("[SupabaseRepository.searchFrames]", error.message);
  return [];
}
```

A console warn is not user-visible. Search-as-no-results is
indistinguishable from search-as-network-error. Same pattern in
`upsertSearchIndex:723`.

---

## H-15. listFrames / listFrameVersions / listSessionVersions have no pagination

**Files:** `src/persistence/supabase-repository.ts:83-104`, `:142-151`,
`:308-317`.

```typescript
const { data, error } = await this.client
  .from("frame_versions")
  .select("payload")
  .eq("frame_id", frame_id)
  .eq("user_id", this.user_id)
  .order("version_number", { ascending: true });
// no .range(), no .limit()
```

A user who has been working on a frame across thousands of autosaves
(easily 10k+ in a multi-week project, given 5 s idle debounce) gets the
ENTIRE frame_versions list loaded into memory + transmitted on every
version-history pane open. Supabase has a default 1000-row max per
request, so the user will silently get the *first* 1000 ascending —
recent history will simply not appear.

For `listFrameVersions`, each row's `payload` is the full FrameVersion
JSONB — easily 50KB-1MB per row depending on graph size. A 1000-row
load can hit 50-500 MB transferred. The browser tab will freeze on
parse.

`listFrames` itself is per-user, so on a single-user scale it's
bounded — but a user with 100+ frames over a few years of use is not
implausible for a law student.

---

## H-16. `loadAppState` on Supabase throws "AppState singleton missing" on first sign-in; the seed only happens client-side

**Files:** `src/persistence/supabase-repository.ts:643-651`,
`src/state/app-state-store.ts:103-126`.

```typescript
// supabase-repository.ts
async loadAppState(): Promise<AppState> {
  const { data, error } = await this.client...maybeSingle();
  if (error) throw new RepositoryError("loadAppState", error.message);
  if (!data) throw new RepositoryError("loadAppState", "AppState singleton missing");
```

The state-store has a graceful catch for this exact string
(`app-state-store.ts:113`), but it ONLY seeds the local store; the
attempted seed-back-to-disk uses `repo.saveAppState(DEFAULT_APP_STATE)`
and silently swallows any failure (`:118-120`). If the very first
`saveAppState` fails (network blip, RLS surprise), the user spends the
whole session with the default; the next sign-in re-seeds-and-fails
again. No telemetry, no recovery hint.

Also: the string-match `msg.includes("AppState singleton missing")` is
a brittle contract between two modules that aren't tested for it.
Refactoring the error message in one file silently breaks the other.

---

## H-17. `Supabase.deleteFrame` relies on schema's ON DELETE CASCADE — no broadcast publish guarantee

**File:** `src/persistence/supabase-repository.ts:129-138`.

`deleteFrame` in the repository deletes the frame row and lets the FK
cascade clean up everything. The repo never broadcasts `frame_deleted`
— that's done in `app-state-store.ts:164` after the repo call resolves.
But peer tabs don't subscribe to the repo's events at all; they only
hear via `crosstab.publish("frame_deleted")`. So:

- Direct calls to `repository.deleteFrame(id)` from any UI surface that
  bypasses `app_state_store.deleteFrame` will silently skip the
  broadcast, leaving peer tabs showing the deleted frame.
- Grep: `repository.deleteFrame` is only called from
  `app-state-store.ts:150` — OK today. But the interface contract
  doesn't require it to be called through the store, and Stream H
  contracts will be silently violated if a future page does the same.

A safer design: have `SupabaseRepository.deleteFrame` accept a
crosstab and publish itself, or make the repository emit a typed event
the store subscribes to.

---

## H-18. Schema migration sweep is per-record, NOT atomic across stores

**File:** `src/persistence/dexie-schema.ts:60-97`.

```typescript
await db.transaction("rw", [...stores], async () => {
  for (const store of stores) {
    const records = await store.toArray();
    for (const record of records) {
      const envelope = { schema_version: from_version, payload: record };
      const migrated = schemaMigrate(envelope as ...);
      const next = (migrated as ...).payload ?? migrated;
      await store.put(next as never);
    }
  }
  ...
});
```

It's wrapped in a transaction, so atomicity is technically there at the
Dexie layer. But:

- This is only the IndexedDb path, which doesn't run in production
  (C-1). When SupabaseRepository ships a real schema bump, the Supabase
  side has **zero migration runner** — `supabase/schema.sql` is
  "idempotent: safe to re-run" for CREATE TABLE statements but offers no
  data-migration path (e.g., adding a required field to all FrameVersion
  payloads).
- The migration registry is empty (`migrations.ts:13` — "empty at v1").
  No real migrations have been written yet, so the sweep is untested in
  practice.
- The envelope `{ schema_version: from_version, payload: record }`
  passed to `schemaMigrate` doesn't match the export envelope shape
  (which is `FrameExport` / `ArgumentSessionExport`). The migrate
  function returns its input unchanged when `schema_version` already
  matches `CURRENT_SCHEMA_VERSION`, so this works today by accident, but
  any non-trivial migration will need to know whether it's processing a
  Frame, FrameVersion, Session, or SessionVersion — the current scaffold
  doesn't pass that distinction.

---

## H-19. AppState save loop guarded by "publish-from-self doesn't echo" — BUT documentation note inaccurate

**File:** `src/persistence/autosave.ts:38-43` (doc),
`src/state/app-state-store.ts:291-298`.

The autosave doc comment says "BroadcastChannel does not deliver to the
same context, so publish-from-self does not cause an echo loop." True
for the *same browsing context*. But the doc and the implementer's mental
model conflate "context" with "tab" — `BroadcastChannel` ALSO delivers
across same-origin iframes within the same tab, and ALSO across
service-worker contexts. Argmap doesn't use those today, but the comment
oversells the safety.

More concretely: `app_state_changed` peer subscriber in
`app-state-store.ts:291-298` calls `loadAppState()` which sets
`app_state` and `is_loaded: true`. Setting that state can trigger
re-renders that re-invoke `pinFrame` / `dismissCoachmark` etc. via user
hover, which schedule another saveAppState. There's no idle-guard or
dedupe on the loop. If a user has tab A flipping a coachmark every
500 ms (e.g., during onboarding tutorials), tab B's `loadAppState` ->
`set({app_state})` -> derived components re-render -> debounced
re-save creates ping-pong. Unlikely in normal use but not impossible.

---

## M-20. `flushAll` doesn't include in-flight saves and doesn't await retries

**File:** `src/persistence/autosave.ts:128-136`, `:138-144`.

`flushFrame` returns immediately if `slot.in_flight` is true. So when
`pagehide` fires and a save is mid-flight (say, started 1 s ago and
awaiting Supabase), `flushAll` does NOT wait for it — it just enqueues
nothing for that frame and resolves. The in-flight Promise is detached
and depends on browser keep-alive (see C-3). Symptom: a save that was
already in flight when the user closed the tab may or may not have
completed; `flushAll` reports "done" with no signal.

---

## M-21. `App_state_in_flight` is set true and never cleared on synchronous throws

**File:** `src/persistence/autosave.ts:237-264`.

```typescript
this.app_state_in_flight = true;
try {
  await this.repo.saveAppState(state);
  this.emit("save_succeeded", { kind: "app_state" });
  this.crosstab?.publish("app_state_changed", {});
} catch (e) { ... }
finally {
  this.app_state_in_flight = false;
}
```

This is actually OK because of `finally` — but **the broadcast.publish
itself runs inside the try.** If `crosstab.publish` throws (custom
sub-implementations of CrossTabBus, e.g., a future telemetry sink that
overloads publish), the `catch` interprets it as a save failure and
emits `save_failed` with the publish error as the cause. The save did
succeed; the user sees "Couldn't save your app state" and panics. Low
probability with the BroadcastChannel implementation but fragile.

Same shape in `flushFrame:155-164` and `flushSession:206-215`: a
broadcast.publish failure misclassifies as a save failure.

---

## M-22. `is_loaded` race: first-launch user can autosave DEFAULT_APP_STATE over disk

**Files:** `src/state/app-state-store.ts:103-126` (loadAppState),
`src/state/app-state-store.ts:172-192` (pinFrame).

The comment at line 16-20 explicitly calls out this hazard ("UI surfaces
that mutate AppState should gate on this flag so the first paint never
autosaves DEFAULT_APP_STATE over the user's real on-disk state").

But the store itself doesn't enforce the gate. `pinFrame`,
`dismissCoachmark`, `setRecent` all happily call `scheduleAppStateSave`
even if `is_loaded === false`. The grep'd UI surfaces would need to
opt in by checking `is_loaded`. Any new UI surface that forgets
reintroduces the bug; the contract lives in a comment, not in code.

A safer design: have `scheduleAppStateSave` no-op when `is_loaded` is
false (or move the gate INTO `app-state-store`'s mutator methods).

---

## M-23. Frame template deep-copy uses `JSON.parse(JSON.stringify(...))` per node

**Files:** `src/persistence/indexeddb-repository.ts:433-473`
(IndexedDb), `:466-490` (Supabase mirror).

`createFrameFromTemplate` deep-copies every node and every edge with
`JSON.parse(JSON.stringify(...))`. For a 500-node template, that's 500
serialize+parse cycles inside one transaction. On phones this is a
visible UI freeze (300-800 ms). A faster alternative is to JSON-stringify
the whole array once, parse once, then patch IDs.

Same pattern at `restoreFrameVersion:676` and `migrateSession:637`
(`frame_version_snapshot: JSON.parse(JSON.stringify(target_version))`).

Functional bonus risk: `JSON.stringify` silently drops `undefined`,
`Function`, `Symbol`, and `Date` → ISO string (without round-tripping).
The schema doesn't have Dates today (uses ISO strings) but future
additions of `Set`, `Map`, or `BigInt` would be silently corrupted.

---

## M-24. Diff function uses `JSON.stringify` for deep-equality — not stable across key order

**File:** `src/persistence/diff.ts:237-240`.

```typescript
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  return JSON.stringify(a) === JSON.stringify(b);
}
```

`JSON.stringify` is **not** key-order-stable. Two objects with the
same fields in different insertion order serialize differently. This
mostly works because both `before` and `after` come from the same code
paths (which always insert keys in the same order), but:

- Anything that round-trips through `JSON.parse(JSON.stringify(...))`
  may emit different key order than the original spread-constructed
  version (V8 has stable key-order for ASCII keys but ordering can shift
  for integer-like keys).
- Re-hydrated payloads from Supabase (PostgREST returns JSON with
  its own ordering) compared against in-memory objects can show
  false positives — `diffFrameVersions` would report fields as
  "changed" when only key order moved. The diff result is consumed by
  the version-history compare view; users would see spurious "edited"
  badges.

Better: use a small recursive deepEqual that sorts keys, or import
fast-deep-equal.

---

## M-25. Search index re-built on EVERY save — not incremental

**File:** `src/persistence/indexeddb-repository.ts:226-228`,
`src/persistence/search-index.ts:13-68`.

```typescript
const entry = buildSearchIndexEntry(frame, to_write);
await this.db.search_index.put(entry);
this.search_cache.upsert(entry);
```

`buildSearchIndexEntry` re-tokenizes every node, every title, every
description from scratch on every FrameVersion save. For a 500-node
frame with ~3 KB of text per node, that's ~1.5 MB of text + regex pass
per autosave debounce, every 5 s while the user types. In a debounce
session that fires 6 times in a minute, that's 9 MB of text processed
+ 6 search_index round-trips piggy-backed onto every IndexedDb
transaction.

Search rebuild also expands the autosave transaction scope to include
`search_index`, increasing the chance of `QuotaExceededError` aborting
the save. Same goes for the cached SearchIndex in-memory: `upsert`
loops over every prior token to remove it from the reverse index
(`search-index.ts:84`), O(node-count × token-count) per call.

For Supabase, the search_index upsert is a separate network round-trip
appended to every saveFrameVersion (`:248`). Doubles the network cost
of every save.

---

## M-26. Search index lacks fuzzy / substring / diacritic-fold

**File:** `src/persistence/search-index.ts:5-11`, `:105-146`.

```typescript
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}
```

`SearchIndex.query` does exact-token AND-match. "negligenc" doesn't
match "negligence". "Cafe" doesn't match "Café". This is documented as
intentional in tests (lines 21-24 of search-index.test.ts confirm "café"
is preserved), but for a search box the user expects prefix matching
("subst") and accent-folding ("cafe" → "café"). The Supabase side uses
`:*` prefix-match in its tsquery (`supabase-repository.ts:672`), so
there's an inconsistency: if/when both code paths are live, results
differ across IndexedDB vs Supabase.

Ranking: `SearchIndex.query` sorts by `frame_id.sort()`
(`search-index.ts:119`) — not by recency, not by relevance. Most-recent
first is a user expectation that's unmet.

---

## M-27. Quota error detection brittle

**File:** `src/persistence/indexeddb-repository.ts:923-927`.

```typescript
if (
  err.name === "QuotaExceededError" ||
  (err.name === "AbortError" && /quota/i.test(err.message ?? ""))
) {
  throw new QuotaExceededError(err.message);
}
```

The regex `/quota/i` will miss the Firefox abort message which uses
"transaction was aborted" without the word "quota" — but does include
a separate QuotaExceededError DOMException via `event.target.error`,
which Dexie propagates through. Safari is also known to throw the
generic DOMException without `.name === "QuotaExceededError"` in
private-browsing mode; instead, the message says "exceeded the quota."

Net: a Safari user hitting quota gets a `RepositoryError` toast that
says "fetch failed" or similar, not "your storage is full." User can't
diagnose. (Moot for production since IndexedDb isn't the path, but the
test suite that asserts on this behavior — `quota.test.ts:23-27` — is
testing only the DOMException-with-correct-name path; it doesn't
exercise the AbortError fallback or the Safari quirk.)

---

## M-28. Cross-tab `app_state_changed` peer subscriber re-issues `loadAppState` which can race the local pending save

**File:** `src/state/app-state-store.ts:291-298`.

Tab A schedules saveAppState (in debouncer). Tab B publishes
`app_state_changed` (it just saved its own AppState). Tab A's peer
listener calls `loadAppState()`, which reads tab B's blob from disk and
overwrites tab A's local in-memory state. **Tab A's pending debounced
save still holds tab A's pre-A's-mutation snapshot.** When it fires (5 s
later), it OVERWRITES tab B's correct state with tab A's stale snapshot
plus A's mutation. Last-write-wins, but the "last write" lost B's
contributions.

The defensive pattern would be to compose: take the freshly-loaded peer
state, layer A's pending mutation on top, then save. Today's code does
not.

---

## M-29. `runValidation` runs on import but NOT on save

**File:** `src/persistence/indexeddb-repository.ts:813-820`.

`importFrame` validates and rejects on errors. Routine
`saveFrameVersion` does not. A code path that constructs a malformed
FrameVersion (e.g., an action-runner bug) will persist it; the next
load will return an invalid object; the runtime computes garbage from
it. There's no defense-in-depth that asserts shape at the persistence
boundary. Stream A's `runValidation` exists; it could be wired in for
free as a soft assertion in dev builds.

---

## M-30. SignOut flush is best-effort and not surfaced

**File:** `src/ui/chrome/sign-out-button.tsx:24-29`.

```typescript
try {
  await autosave.flushAll();
} catch {
  // Swallow — we still want to sign out even if the flush fails.
}
void signOut();
```

If the flush fails (network out), the user signs out anyway and the
unsaved edits are gone forever (because the in-memory repo unmounts on
key-change). The catch swallows silently — no toast, no
"Edits couldn't sync; sign out anyway?" dialog. The comment justifies
the design choice but the user-visible consequence is unmitigated.

---

## M-31. `setRecent` cap of 20 is silent truncation

**File:** `src/state/app-state-store.ts:194-203`.

```typescript
setRecent(frame_id: FrameId): void {
  const { app_state } = get();
  const filtered = app_state.recents.filter((id) => id !== frame_id);
  const next_state: AppState = {
    ...app_state,
    recents: [frame_id, ...filtered].slice(0, 20),
  };
```

If the user has 20+ recent frames, the 21st silently bumps the oldest
off. No user notification, no way to see history beyond the last 20.
For a multi-month legal-analysis project this is too short.

---

## M-32. `saveSession` (non-version) doesn't broadcast `session_saved`

**File:** `src/persistence/supabase-repository.ts:286-297`, `src/persistence/indexeddb-repository.ts:247-251`.

Both impls allow direct `saveSession` (the header row), but neither
broadcasts. Peer tabs viewing the session list won't refresh until
either a `session_saved` (which only fires from saveSessionVersion via
autosave) or a `frame_saved` is published. Most edits go through
sessionVersion so this is rarely felt, but `migrateSession` calls
`saveSession` for the migration target (`:590` in Supabase) — a peer
tab viewing the session list won't see the migrated frame_version_id
change until something else triggers a refresh.

---

## M-33. `migrateSession` Supabase version_number is wrong — it doesn't increment

**File:** `src/persistence/supabase-repository.ts:567-581`.

```typescript
const new_version: ArgumentSessionVersion = {
  ...prior_version,
  id: new_version_id,
  session_id,
  parent_version_id: prior_version.id,
  created_at: ts,
  is_milestone: true,
  change_summary: `Migrated to frame v${target.version_number}`,
  premises: new_premises,
  ...
};
```

The spread of `prior_version` includes `version_number`. The new
version inherits the prior one's number. Then `saveSessionVersion` runs
(`:591`), which re-stamps the version_number based on the on-disk
prior (`:395-399`). So **it accidentally works**, but only because
`saveSessionVersion`'s chain-repair logic overwrites the inherited
number. If the chain-repair ever loses that defensive code (or the
prior is missing for any reason), `migrateSession` produces a duplicate
version_number. Compare with IndexedDb version (`:608-616`) which
explicitly computes `max_version + 1`.

---

## M-34. SupabaseRepository.searchFrames maps every hit to `hit_field: "title"` and an empty snippet

**File:** `src/persistence/supabase-repository.ts:687-695`.

```typescript
return (data ?? []).map((row): FrameSearchHit => {
  const p = row.payload as { title?: string; snippet?: string };
  return {
    frame_id: row.frame_id,
    title: p.title ?? "",
    hit_field: "title",   // <- always title
    snippet: p.snippet ?? "",
  };
});
```

The Repository interface contract says `hit_field` is one of "title" |
"description" | "tag" | "node_text" | "conclusion_statement", and the
IndexedDb impl correctly picks based on the matched token's field
provenance. The Supabase impl always reports "title", losing the
field-attribution information the UI was supposed to render in
`SearchResultBadge` (or wherever the future search UI lives).

---

## L-35. `restoreFrameVersion` Supabase impl re-fetches summaries to compute max — unnecessary network call

**File:** `src/persistence/supabase-repository.ts:600-602`.

```typescript
const existing = await this.listFrameVersionSummaries(frame_id);
const max_version = existing.reduce((m, v) => Math.max(m, v.version_number), 0);
```

`listFrameVersionSummaries` SELECTs every summary (no LIMIT — same as
H-15) just to compute one MAX. A `select("version_number").order(...,
ascending: false).limit(1)` would be O(1) bytes.

---

## L-36. `IndexedDbRepository.openOrUpgrade` is the only path to migrate, never called in production

**Files:** `src/persistence/indexeddb-repository.ts:58-80`,
`src/main.tsx:96-99`.

The migration sweep code-path is dead in production. If/when an
IndexedDb fallback is added back, this file is the migration runner; if
not, it's documented behavior nobody can exercise.

---

## L-37. `dexie-schema.ts` declares CURRENT_DEXIE_VERSION = 1 but it's never consulted

**File:** `src/persistence/dexie-schema.ts:18`.

Looks like a planned multi-version Dexie upgrade path but no
`this.version(2).stores(...)` or `.upgrade(tx => ...)` calls. A real
Dexie schema bump requires both the version increment AND an upgrade
callback — neither is staged. When schema_version=2 lands, the
migration story is bigger than just bumping the constant.

---

## L-38. `BroadcastEvents` types — `frame_saved` and `session_saved` payloads lack a `user_id` discriminator

**File:** `src/persistence/repository.ts:306-318`.

Even though the channel name is per-user-scoped, a defensive payload
field would catch class C-6 (channel handle reuse across user switch).
Today a stale `u1`-scoped channel listener that fires after
`u2`-authenticated repo took over will happily trigger a `loadFrame`
that hits Supabase with `u2`'s credentials — could return empty,
return error, or surface the wrong frame. A `payload.user_id` check
would let listeners reject foreign events.

---

## L-39. `frame_version_drift_warning` is built only by IndexedDb's `toSessionSummary`, not by Supabase

**File:** `src/persistence/indexeddb-repository.ts:894-910` vs
`src/persistence/supabase-repository.ts:261-270`.

```typescript
// supabase-repository.ts:261-270
return (data ?? []).map((row): ArgumentSessionSummary => {
  const s = row.payload as ArgumentSession;
  return {
    id: s.id,
    frame_id: s.frame_id,
    title: s.title,
    updated_at: row.updated_at,
    current_version_id: s.current_version_id,
  } as unknown as ArgumentSessionSummary;  // <- no drift_warning, no frame fetch
});
```

The Supabase impl omits `frame_version_drift_warning` entirely. The
sessions list view in the UI won't render the drift banner for users on
Supabase (i.e., all production users). Stream H feature missing in
prod.

---

## L-40. `repository-round-trip.test.ts:72-86` tests drift warning against IndexedDb only

Sibling to L-39: the test exists, asserts the warning is set, but only
exercises the IndexedDb impl. The Supabase impl has no test coverage
for the drift case, which is why H-39 went unnoticed.

---

## L-41. Tests are entirely IndexedDb-based — Supabase impl has NO test coverage

**File:** `tests/persistence/_setup.ts:32` uses `IndexedDbRepository`
exclusively. Every test in `tests/persistence/*.test.ts` is against the
in-memory fake-indexeddb. There are zero mocks or harness tests for
`SupabaseRepository`. Given that SupabaseRepository is the *only*
production path, this is a yawning gap. P0-4 (parent_version_id repair)
has Supabase code that mirrors IndexedDb logic; no test confirms the
Supabase mirror works. Same for P0-3, P0-6 race fixes.

---

## L-42. `repository.ts` interface vs implementations — `archived` flag exists in Frame type but only Supabase uses it

**File:** `src/persistence/supabase-repository.ts:88, 123, 257, 293`.

```typescript
.eq("archived", false)
archived: frame.archived ?? false
```

`Frame.archived` is honored by Supabase's `listFrames` (returns only
unarchived). IndexedDb's `listFrames` doesn't filter on `archived` at
all (`:84-87`). Listings diverge across impls; tests don't cover it.

---

## L-43. `migrateSession` Supabase impl drops `interpretation_selections` from the new version

**File:** `src/persistence/supabase-repository.ts:569-581`.

The IndexedDb impl explicitly migrates `interpretation_selections`
(`:598-605`). The Supabase impl's `new_version` spread inherits
`interpretation_selections` from `prior_version` unchanged — but the
prior_version's interpretations may reference deleted Term nodes, which
won't be rewritten or filtered. The Supabase user post-migration may
see stale interpretation_selections pointing at deleted terms,
producing compute errors downstream.

---

## L-44. No telemetry / log for save failures beyond toast

If a user reports "argmap lost my work", there is no server-side log
that captures the failure. The Supabase API itself logs the
4xx/5xx, but linking it back to a user-claimed loss event requires
external instrumentation. Adding a `track('save_failed', {...})` hook
to the autosave's catch would create the breadcrumb trail this product
needs.

---

## L-45. `autosave.dispose` doesn't drain in-flight saves

**File:** `src/persistence/autosave.ts:283-298`.

```typescript
dispose(): void {
  this.disposed = true;
  for (const [, slot] of this.frame_slots) { ... clear timers ... }
  ...
  this.frame_slots.clear();
  ...
}
```

In-flight saves (those with `slot.in_flight === true`) are left
detached when `dispose` clears the slots map. Their result emits
events to listeners that have been cleared, so the events are dropped.
Tab close + remount during a save → user thinks they saw a save
succeed, but in reality the success-event was sent into the void.

---

## L-46. Tests assume `setImmediate` exists in the test runtime

**File:** `tests/persistence/_setup.ts:7-11`.

`setImmediate` is Node-specific; Vitest in browser-emulation mode
doesn't provide it. The `flushPromises` helper relies on it. Tests
silently break if Vitest config changes runtime. Cosmetic but worth a
guard.

---

## L-47. RLS scoping pattern: `saveFrame` upsert filters by primary key only — safe today, fragile by design

**File:** `src/persistence/supabase-repository.ts:117-127`.

```typescript
async saveFrame(frame: Frame): Promise<void> {
  const { error } = await this.client.from("frames").upsert({
    id: frame.id, user_id: this.user_id, payload: frame, ...
  });
```

The `id` column is the PRIMARY KEY (schema.sql:35). If user A
constructs a frame with id `X` and user B happens to know that id
(e.g., via a URL the user shared), user B's `upsert` with id `X` hits
a PK conflict; the UPDATE branch's `USING (user_id = auth.uid())` does
not match (the existing row is user A's), so the UPDATE silently
affects zero rows and the upsert returns "no error" with no row
modified. No data leaks, no rows mutated. The worst observable
outcome is **information leakage about id existence** — a user could
infer that a UUID belongs to another user from a non-error-but-no-row
upsert response.

Still worth tightening: each `upsert` should add `.eq("user_id",
this.user_id)` defensively, and the `(id, user_id)` pair could be a
composite uniqueness constraint instead of `id` alone. This costs
little and removes a foot-gun for a future direction where users share
template UUIDs across orgs (id collisions become a denial-of-service
vector: user B refuses to delete a stale row that blocks user A's
imports).

---

## Summary

| Severity | Count |
| --- | --- |
| Critical | 7 |
| High | 12 |
| Medium | 15 |
| Low | 13 |
| **Total** | **47** |

**Headline themes**

1. **There is no offline / IndexedDB cache in production.** All persistence is
   single-path through Supabase, and the failure modes of that path
   (token expiry, network blips, no retry, no sendBeacon, fire-and-forget
   pagehide flush) compound into a real "I lost my edits" risk for any
   user not on perfect connectivity.
2. **Optimistic UI never rolls back on save failure** — every patch
   mutates in-memory state before the save is scheduled, and the
   `save_failed` listener only sets an `error` string. Combined with
   sticky toasts and no retry, the user keeps typing into a state
   that's already lost; the loss only becomes visible on the next
   `loadFrame` (navigation or page reload). The store carries no
   "dirty since last successful save" flag and no `beforeunload`
   warning when in-memory state has diverged from disk.
3. **"Atomicity" guarantees from Stream H §1-§4 are honored by the
   IndexedDb impl (dead code) and violated by the Supabase impl
   (live).** Composite operations are sequential network calls with no
   rollback. Partial-write states are unrecoverable from the UI.
4. **Cross-tab broadcast scoping has a subtle bug** around user-switch
   in the same tab — `useMemo` doesn't close the old channel. Mostly
   masked by `key={user.id}` remount, but fragile.
5. **Search index in production is inert** — `tsv` field is permanently
   null, no UI calls `searchFrames`, every search returns []. The
   IndexedDb side has real search logic that nobody runs.
6. **Test coverage is entirely IndexedDb-based** — the actual production
   repository class has zero tests. P0 race fixes for IndexedDb were
   carefully ported into the Supabase mirror but never verified there.
7. **save-failure UX is leaky.** Sticky toasts, no auto-dismiss on
   subsequent success, no retry button, no "your edits are in danger"
   banner during sustained outage.
