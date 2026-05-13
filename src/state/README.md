# `src/state/`

**Spec:** `docs/stream_i_state_spec_v1.html`. **Coding session:** I.5 (2026-05-12).
The state module bridges persistence, runtime, and UI. It owns the Zustand stores,
the React Context provider, the action-runner orchestration layer, and the selectors.

## Import boundary

`src/state/` may import from `@/schema`, `@/runtime`, `@/persistence`, `@/modes`,
`react`, and `zustand`. It must not import from `@/ui`, `@/llm-hooks`, or `@/layout`.
Enforced by ESLint (`no-restricted-imports`). The `@/modes` dependency was added in
I.9c (F-022) so that `selectInterviewItems` can wrap `computeInterviewOrder` for the
argument-running UI; `@/modes` continues to import `@/state` only for type signatures.

## Public API surface

Barrel: `@/state`.

---

### ComputeDriver (`compute-driver.ts`)

```typescript
import { createComputeDriver } from "@/state";

const driver = createComputeDriver({ now: () => new Date().toISOString() });

// Call compute() with session's current snapshot; `at` pins the computed_at timestamp.
const result = driver.runFor(session, at?);

// Build a ComputeInput without calling compute (useful for testing).
const input = driver.buildInput(session, computed_at);
```

`ComputeDriver` never reads the wall clock itself — `now()` is called exactly once per
`runFor` invocation when `at` is omitted. This satisfies the F-013 computed_at rule.

---

### Action runner (`action-runner.ts`)

**Types and dispatch tables** (interfaces implemented by I.6 modes):

```typescript
import type {
  FramePatch,
  SessionPatch,
  FrameActionDispatchTable,
  SessionActionDispatchTable,
  FrameTransformResult,
  SessionTransformResult,
  DispatchOpts,
  ConclusionDirectionResolution,
  CheckpointAnswer,
} from "@/state";
```

`FramePatch` uses `node_removed`/`edge_removed` (contracts v2 canonical, not `node_deleted`).

Each `FrameActionDispatchTable` entry: `(frame, fv, patch, opts) => FrameTransformResult`.
The `frame` parameter is passed so metadata-only transforms (`metadata_edited`,
`architectural_mode_changed`) can populate `FrameTransformResult.frame_partial`.

`FrameTransformResult.frame_partial` holds Frame-level updates (title, description,
mode, flavor, positions, etc.). `runFrameAction` merges them onto `next_frame`; the
`next_version` carries structural changes (nodes, edges).

**Orchestrators** (pure, no I/O):

```typescript
import { runFrameAction, runSessionAction, validateOnly } from "@/state";

// Apply a frame patch, validate, optionally recompute active sessions.
const result = runFrameAction({ frame, current_version, patch, now, generateId, dispatch, compute_driver?, active_sessions? });
// result: { next_frame, next_version, recomputed: Map<session_id, ComputeResult>, validation, change_summary? }

// Apply a session patch and recompute.
const result = runSessionAction({ session, current_version, patch, now, generateId, dispatch, compute_driver });
// result: { next_session, next_version, compute_result }

// Validation only (phase 1). compute_driver param is accepted but unused; included for uniformity.
const validation = validateOnly(frame_version, compute_driver?);
```

Both orchestrators stamp new version metadata (`id`, `version_number`, `parent_version_id`,
`created_at`) after calling the dispatch transform — dispatch functions need not set these.

---

### FrameStore (`frame-store.ts`)

```typescript
import { createFrameStore } from "@/state";

const store = createFrameStore({
  repo, autosave, crosstab,
  dispatch: frame_dispatch_table,   // from I.6 modes
  compute_driver,
  now, generateId,
});

// Zustand vanilla store — use store.getState() or useStore(store, selector)
store.getState().loadFrame(frame_id);   // async; sets frame + frame_version + validation
store.getState().applyPatch(patch);     // sync; updates state + schedules autosave
store.getState().saveFrameMilestone(change_summary?);  // flushes as is_milestone=true
store.getState().dispose();             // unsubscribes from autosave events
```

`FrameStoreSnapshot`: `{ frame, frame_version, validation, is_loading, error }`.

---

### SessionStore (`session-store.ts`)

```typescript
import { createSessionStore } from "@/state";

const store = createSessionStore({
  repo, autosave, crosstab,
  dispatch: session_dispatch_table,
  compute_driver, now, generateId,
});

store.getState().loadSessionsForFrame(frame_id); // populates sessions_list
store.getState().loadSession(session_id);        // loads session + version + runs compute
store.getState().applyPatch(patch);              // sync; updates state + compute + autosave
store.getState().saveSessionMilestone(change_summary?);
const orphans = await store.getState().previewMigration(target_frame_version_id); // OrphanCandidate[]
store.getState().dispose();
```

`SessionStoreSnapshot`: `{ session, session_version, compute_result, sessions_list, is_loading, error }`.

---

### AppStateStore (`app-state-store.ts`)

```typescript
import { createAppStateStore } from "@/state";

const store = createAppStateStore({ repo, autosave, now });

// I/O operations:
await store.getState().loadAppState();
await store.getState().loadFrames();
const { frame, version } = await store.getState().createFrame({ title, mode?, flavor? });
await store.getState().deleteFrame(frame_id);
await store.getState().deleteSession(session_id);

// Sync preference mutations (all schedule autosave):
store.getState().pinFrame(frame_id, true);
store.getState().setRecent(frame_id);
store.getState().dismissWarning("first_launch");
store.getState().resetCoachmarks();
store.getState().markNewFeatureNoticeSeen("v2-export");
store.getState().setOutputViewTabChoice(frame_id, "prose");
store.getState().dispose();
```

`createFrame` calls `repo.createBlankFrame()` (added to Repository interface in I.5, closing F-015 item 2).

`AppStateStoreSnapshot`: `{ app_state, frames, is_loading, error }`.

---

### React Context (`context.tsx`)

```typescript
import {
  RepositoryProvider, useRepository,
  useFrameStore, useSessionStore, useAppStateStore,
} from "@/state";

// Wire at app root:
<RepositoryProvider
  repo={repo}
  autosave={autosave}
  crosstab={crosstab}
  frame_dispatch={frameActionTable}    // from I.6 modes
  session_dispatch={sessionActionTable}
  llm_settings_default={llmSettings}
  now={() => new Date().toISOString()}
  generateId={() => crypto.randomUUID()}
>
  {children}
</RepositoryProvider>

// Hooks:
const ctx = useRepository();  // throws outside provider
const frame = useFrameStore(s => s.frame);
const compute = useSessionStore(s => s.compute_result);
const appState = useAppStateStore(s => s.app_state);
```

Stores are created with `createStore` from `zustand/vanilla` and accessed via
`useStore(store, selector)`. This enables factory-function pattern for testability
without tying store lifecycle to the React tree.

The `frame_dispatch` and `session_dispatch` props are injected from I.6 (modes).
Until I.6, tests pass stub tables.

---

### Selectors (`selectors.ts`)

All selectors are pure functions — no store subscription, no I/O.

```typescript
import {
  selectValidationErrors,
  selectValidationWarnings,
  selectNodeStatus,
  selectOpenGates,
  selectNodeStatusCounts, // { satisfied, open, contested, foreclosed, not_applicable, total }
  selectStatusSummary, // (snapshot) => { shape, resolved_count, total_count, conclusion_label? } | null
  selectInterviewItems, // (snapshot) => InterviewItem[] — wraps computeInterviewOrder
  selectFrameVersionDrift, // (session_snapshot, frame_snapshot) => FrameVersionDriftSummary | null
  selectOutputForView, // (snapshot, tab) => OutputViewPayload | null
  selectStatusBadge, // (snapshot, node_id) => StatusBadgeData | null
  selectCascadeSummary, // wraps computeCascadeReport
  selectPinnedFrames,
  selectFirstLaunchDismissed,
  selectNewFeatureNoticeSeen,
} from "@/state";
```

The pre-I.9c selector named `selectStatusSummary` (per-status counts) was renamed
`selectNodeStatusCounts` to free the spec-canonical name for the I.9c argument-running
status-summary chip. See F-022.

---

## What downstream sessions should know

- **`FrameActionDispatchTable` / `SessionActionDispatchTable` are defined here and
  implemented in I.6 (modes).** Tests in I.5 use stub tables. I.6 imports these
  interfaces from `@/state` and provides concrete implementations.

- **`FrameTransformResult.frame_partial`** carries Frame-level field updates (title,
  mode, positions, etc.). `runFrameAction` merges this onto `next_frame`; the dispatch
  function does NOT need to set `current_version_id` or `updated_at` on the frame.

- **`runFrameAction` always creates a new `FrameVersion`**, even for metadata-only
  patches. Dispatch functions return `next_version: fv` (unchanged content) for metadata
  patches; the runner stamps a new id/version_number.

- **`AppState` extended (F-015 additive)**: `dismissed_warnings`,
  `seen_new_feature_notices`, `output_view_tab_choice_by_frame`, `pane_widths` added
  as optional fields to `AppState` in `src/persistence/repository.ts`.

- **`createBlankFrame` added to persistence (F-015 #2)**: `Repository` interface and
  `IndexedDbRepository` now implement `createBlankFrame({ title, mode?, flavor? })`.
  Returns `{ frame: Frame; version: FrameVersion }`.

- **React context tests require `@vitest-environment happy-dom`** plus
  `import "fake-indexeddb/auto"` at the top of the test file. `@testing-library/react`
  is a devDependency.

- **Store `dispose()`**: Call when tearing down (tests, unmount scenarios). Unsubscribes
  from autosave `save_failed` events.

- **`RepositoryProvider` props include `frame_dispatch` and `session_dispatch`** — the
  app root (I.9 UI) imports from `@/modes` and passes the tables here.

## Test setup notes

State tests live in `tests/state/`. Tests that use stores directly import
`freshDb` and `flushPromises` from `tests/state/_setup.ts` (which re-exports from
`tests/persistence/_setup.ts`). The same `flushPromises(rounds)` pattern applies when
waiting for async repo operations.

Context tests use `@vitest-environment happy-dom` annotation and must import
`fake-indexeddb/auto` manually (the global `tests/persistence/_setup.ts` only runs in
the `node` environment). `@testing-library/react` is used for `renderHook`.
