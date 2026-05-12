# persistence

IndexedDB-backed repository, autosave controller, cross-tab event bus, structural diff, and full-text search index for the argument mapping application.

## Public API surface

### Repository interface (`repository.ts`)

```typescript
import type { Repository, AppState, FrameSummary, ... } from "@/persistence";
```

The `Repository` interface defines all storage operations. The concrete implementation is `IndexedDbRepository` (see below). Downstream modules code against `Repository` to stay testable.

Key method groups:

- **Frames**: `listFrames`, `loadFrame`, `saveFrame`, `deleteFrame`
- **FrameVersions**: `listFrameVersions`, `loadFrameVersion`, `saveFrameVersion`
- **Sessions**: `listSessionsForFrame`, `loadSession`, `saveSession`, `deleteSession`
- **SessionVersions**: `listSessionVersions`, `loadSessionVersion`, `saveSessionVersion`
- **Composite (atomic)**: `createFrameFromTemplate`, `migrateSession`, `restoreFrameVersion`, `restoreSessionVersion`
- **App state**: `loadAppState`, `saveAppState`
- **Search**: `searchFrames`
- **Import/export**: `exportFrame`, `importFrame`, `exportSession`, `importSession`

### IndexedDbRepository (`indexeddb-repository.ts`)

```typescript
import { IndexedDbRepository } from "@/persistence";

const repo = new IndexedDbRepository({ db_name?: string, now?: () => string, generateId?: () => string });
await repo.openOrUpgrade(); // must be called before any other method
```

`openOrUpgrade` opens the Dexie database, initializes `AppState` if missing, runs any pending schema migration sweep, and primes the in-memory search cache.

Call `repo.close()` when tearing down (required in tests to release fake-indexeddb resources).

### AutosaveController (`autosave.ts`)

Debounced save scheduler: 5 s idle / 30 s max for frames and sessions, 1 s for app state.

```typescript
import { createAutosaveController, AUTOSAVE_IDLE_MS, APP_STATE_DEBOUNCE_MS } from "@/persistence";

const controller = createAutosaveController({ repo });
controller.on("save_succeeded", (e) => {
  /* e.kind, e.version_id */
});
controller.on("save_failed", (e) => {
  /* e.error instanceof RepositoryError */
});

controller.scheduleFrameSave({ frame, new_version });
controller.scheduleSessionSave({ session, new_version });
controller.scheduleAppStateSave(appState);

await controller.saveFrameMilestone({ frame, new_version }); // bypasses debounce
await controller.saveSessionMilestone({ session, new_version });
await controller.flushAll(); // flush everything pending now
controller.dispose(); // clears all timers, detaches listeners
```

After a `save_failed` event the controller retains the payload. The next `scheduleFrameSave` (or `scheduleSessionSave`) call for the same id reschedules it for retry.

### CrossTabBus (`broadcast.ts`)

```typescript
import { createCrossTabBus, BROADCAST_CHANNEL_NAME } from "@/persistence";

const bus = createCrossTabBus(); // defaults to BROADCAST_CHANNEL_NAME
const unsub = bus.subscribe("frame_saved", (p) => {
  /* p.frame_id, p.version_id */
});
const unsub2 = bus.subscribe("session_saved", (p) => {
  /* p.session_id, p.version_id */
});
bus.publish("frame_saved", { frame_id, version_id });
unsub(); // detach this subscriber
bus.close();
```

Returns a no-op bus when `BroadcastChannel` is not available (SSR, old environments).

### Diff functions (`diff.ts`)

```typescript
import { diffFrameVersions, diffSessionVersions, LAYOUT_ONLY_FIELDS } from "@/persistence";

const diff = diffFrameVersions(versionA, versionB);
// diff.nodes_added, diff.nodes_removed, diff.nodes_edited (sorted by id)
// diff.edges_added, diff.edges_removed, diff.edges_edited
// diff.layout_only — true only when ALL changes are in LAYOUT_ONLY_FIELDS
// diff.layout_changed_count — count of layout-only changes
// diff.metadata.changed_fields — top-level FrameVersion fields that changed

const sdiff = diffSessionVersions(versionA, versionB);
// sdiff.premises_added, .premises_removed, .premises_edited (keyed by id)
// sdiff.checkpoint_responses_changed (keyed by checkpoint_id)
// sdiff.interpretation_selections_changed (keyed by term_id)
```

`LAYOUT_ONLY_FIELDS = ["presentation"]` — the set of node fields whose changes are bucketed as layout-only.

### Search index (`search-index.ts`)

```typescript
import { tokenize, buildSearchIndexEntry } from "@/persistence";
```

`tokenize(str)` — lowercases, strips punctuation, splits on whitespace. Unicode-aware.

`buildSearchIndexEntry(frame, version)` — builds a `SearchIndexEntry` for a frame. The repository maintains the index automatically; downstream modules call `repo.searchFrames(query)` instead of using these functions directly.

### Error types (`repository.ts`)

```typescript
import { RepositoryError, QuotaExceededError } from "@/persistence";

try {
  await repo.saveFrameVersion(v);
} catch (e) {
  if (e instanceof QuotaExceededError) {
    /* storage full */
  }
  if (e instanceof RepositoryError) {
    /* e.operation, e.message */
  }
}
```

## Import boundary

`src/persistence/` imports only `@/schema` and third-party libraries (Dexie). It must not import from `@/runtime`, `@/state`, `@/ui`, `@/llm-hooks`, `@/modes`, or `@/layout`. This is enforced by ESLint (`no-restricted-imports`).

## Test setup notes

Tests use `fake-indexeddb/auto` (injected via `tests/persistence/_setup.ts`) and `freshDb()` to get an isolated repository instance per test. Because `fake-indexeddb` dispatches IDB operation results via `setImmediate` (not microtasks), tests that fire autosave timers via `vi.advanceTimersByTimeAsync` must call `await flushPromises()` afterwards to drain the pending IDB callbacks before asserting on events.

```typescript
import { freshDb, flushPromises } from "./_setup";

await vi.advanceTimersByTimeAsync(AUTOSAVE_IDLE_MS + 1);
await flushPromises(); // drain fake-indexeddb setImmediate queue
expect(events).toHaveLength(1);
```
