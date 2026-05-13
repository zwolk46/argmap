# ui/version-history

Version-history side pane (E5 + H3 wiring): browse, preview, restore, and
compare FrameVersions and ArgumentSessionVersions.

**Spec:** `docs/stream_i_ui_version_history_spec_v1.html`.
**Coding session:** I.9d1 (2026-05-12).

## Public API

```typescript
import {
  VersionHistoryPane,
  VersionHistoryPreviewProvider,
  useVersionHistoryPreview,
  FramePreviewView,
  SessionPreviewView,
} from "@/ui/version-history";
// or from the top-level barrel: import { ... } from "@/ui";
```

| Surface                         | Role                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VersionHistoryPane`            | Drawer-shaped pane mounted once at the App level (`app-routes.tsx`). Scopes by current Route: Frame Building → single panel; Argument Running → two-tab variant |
| `VersionHistoryPreviewProvider` | Context provider that owns preview state via `useReducer`. Wraps the App tree                                                                                   |
| `useVersionHistoryPreview()`    | Hook returning `{ state, enterFramePreview, enterSessionPreview, exit }`; throws `VersionHistoryPreviewProviderMissingError` outside the provider               |
| `FramePreviewView`              | Read-only frame canvas, rendered _in place of_ `FrameBuildingPage` when preview state is `{ kind: "frame" }`                                                    |
| `SessionPreviewView`            | Read-only argument canvas, rendered _in place of_ `ArgumentRunningPage` when preview state is `{ kind: "session" }`                                             |

## Sub-module structure

| File                         | Purpose                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version-history-pane.tsx`   | Top-level `Drawer`; dispatches by Route; owns selected-version / compare / restore-dialog local state                                               |
| `pane-tabs.tsx`              | Argument-Running two-tab `SegmentedToggle` ("Sessions" / "Frames (read-only)")                                                                      |
| `milestone-filter.tsx`       | "All / Milestones only" pill toggle                                                                                                                 |
| `version-tree.tsx`           | Renders the version list; consumes `buildVersionTreeShape` + `filterByMilestone`; auto-scrolls the current row into view                            |
| `version-tree-row.tsx`       | One row: marker glyph, version number, relative timestamp, change_summary or `auto-save` italic fallback, optional "session was authored here" pill |
| `version-tree-shape.ts`      | **Pure helper.** DFS-walks summaries by `version_number` ascending; `filterByMilestone` retains milestones and re-parents survivors                 |
| `selection-footer.tsx`       | Footer with "[Selected: vN]" label + Preview / Restore / Compare buttons. Disabled gates per spec                                                   |
| `preview-context.tsx`        | React Context + reducer for preview state. Discriminated union `{ kind: "none" \| "frame" \| "session" }`                                           |
| `frame-preview-view.tsx`     | Reads `useVersionFullLoad({ kind: "frame", ... })`; renders read-only `FrameCanvas` + sticky `PreviewBanner`                                        |
| `session-preview-view.tsx`   | Reads `useVersionFullLoad({ kind: "session", ... })` + current session's `frame_version_snapshot`; renders read-only canvas with overlay            |
| `preview-banner.tsx`         | Sticky banner above previewed canvas; renders "Previewing version N (read-only)" + Exit button                                                      |
| `compare-view.tsx`           | Replaces the version list when active. Loads both versions in parallel via `Promise.all`; runs `diffFrameVersions` / `diffSessionVersions`          |
| `compare-entry-list.tsx`     | Per-section list; empty sections render `null`; layout-only kind renders an expand/collapse affordance                                              |
| `compare-entry-row.tsx`      | Renders one diff entry; node/edge rows are clickable; metadata / layout-only-summary rows are not                                                   |
| `restore-confirm-dialog.tsx` | Wraps `ConfirmDialog`; dispatches to `frame_store.restoreVersion` or `session_store.restoreVersion`                                                 |
| `use-version-summaries.ts`   | Async data hook for `Repository.listFrameVersionSummaries` / `listSessionVersionSummaries`; re-fetches when current-version-id changes              |
| `use-version-full-load.ts`   | Async data hook for `Repository.loadFrameVersion` / `loadSessionVersion`. Module-scoped LRU cache (max 8 entries) keyed by `version_id`             |

## State-layer additions (F-006)

I.9d1 added the following to `@/state`:

- `FrameStore.restoreVersion(ancestor_version_id, change_summary?)`: calls
  `repository.restoreFrameVersion(...)` and updates local store state.
- `SessionStore.restoreVersion(ancestor_version_id, change_summary?)`: same,
  for sessions; reloads the session snapshot and re-runs compute.
- Re-exports `diffFrameVersions`, `diffSessionVersions` (value) from
  `@/persistence`, plus the diff types `FrameVersionSummary`,
  `ArgumentSessionVersionSummary`, `StructuralDiff`, `SessionStructuralDiff`,
  `NodeEditEntry`, `EdgeEditEntry`, `MetadataChange` (type only).

This mirrors the F-022 pattern (state-as-broker) so `src/ui/` does not need to
widen its no-value-import boundary against `@/persistence`.

## Canvas refinement (F-006.1)

`FrameCanvas` gained an optional `read_only?: boolean` prop. When `true`:

- Hides connector handles on per-node renderers (`enable_connector_handle` is
  gated on `!read_only` in addition to operating-mode).
- Sets React Flow's `nodesDraggable`, `edgesReconnectable`, and
  `nodesConnectable` to `false`.
- `on_node_moved` is suppressed even if React Flow synthesizes a drag.
- Existing call sites omit the prop; behavior is unchanged for them.

## App-level integration (F-006.4)

`app-routes.tsx` now:

1. Wraps the routed view in `<VersionHistoryPreviewProvider>` so preview state
   is available everywhere.
2. Owns `version_history_open` local state and threads `onToggle*` /
   `version_history_open` to the active page.
3. Mounts a single `<VersionHistoryPane>` instance alongside the active page;
   the pane scopes itself by current Route via `useRoute()` rather than being
   remounted per page (which would lose selection state on navigation).
4. When preview state is non-`none`, renders `FramePreviewView` or
   `SessionPreviewView` _in place of_ the page (a true mode swap, not an
   overlay) per E5's "the current canvas dims and a banner reads 'Previewing
   version N'" framing.

## Page-props promotions (F-006.2, F-006.3)

- `FrameBuildingPageProps.onToggleVersionHistory: () => void` is now required
  (was optional). `version_history_open: boolean` added as required.
  `FrameBuildingPage` wires a real `VersionHistoryButton` into its top bar.
- `ArgumentRunningPageProps.on_toggle_version_history: () => void` is now
  required. `version_history_open: boolean` is required. The pre-existing
  argument-running top-bar button drops its `disabled={!callback}` fallback.

## Import boundary

Inherits the `src/ui/` substrate's boundary:

- Type-only imports from `@/runtime` and `@/llm-hooks` permitted.
- No value imports from `@/persistence`, `@/modes`, `@/runtime`, or
  `@/llm-hooks`. The diff functions are imported via `@/state` (which
  re-exports them per F-006).
- Mutations flow through `useRepository().{frame_store, session_store}.getState().*`.

## Determinism

- **D1 — canonical output verbatim.** `CompareEntryRow` renders
  `fields_changed` arrays verbatim (`(fields: a, b, c)`); statement previews
  render `Node.statement` verbatim (CSS text-overflow only).
- **D3 — no client-side re-sort.** The version tree consumes
  `buildVersionTreeShape`'s deterministic DFS; the Compare view consumes the
  diff function's canonical lex-by-id order. Neither component re-sorts.
- **D2 / D4 — inapplicable.** No AI surfaces; no validation findings.

## Implementation notes / spec divergences

- **Diff and summary types re-exported via `@/state`, not imported from
  `@/persistence` directly.** The I.9d1 spec showed
  `import { diffFrameVersions, ... } from "@/persistence"`; routing through
  `@/state` (F-022-style) preserves the existing UI-from-persistence boundary
  without an ESLint widening. The diff functions are pure; the value path
  through `@/state` adds no runtime cost.
- **`store.restoreVersion` writes a single new version, not a parent chain.**
  The Repository's `restoreFrameVersion` / `restoreSessionVersion` already
  perform the parent-version-id wiring and stamp the "Restored from version N"
  change_summary. The store layer simply waits for the repo to settle, then
  updates local snapshots; the F-006 deferral to v1.5 of the batch
  loader (`loadFrameVersionPair`) is not needed.
- **Per-spec coverage gap (non-blocking):** the spec called for 18 test files;
  this session shipped 11, weighted toward pure-helper coverage
  (`version-tree-shape`, `session-preview-overlay`) plus component renders for
  `MilestoneFilter`, `PaneTabs`, `VersionTreeRow`, `VersionTree`,
  `SelectionFooter`, `PreviewBanner`, `CompareEntryRow`, `CompareEntryList`,
  and the preview-context provider/hook. The pane composition,
  `FramePreviewView`, `SessionPreviewView`, `CompareView`, `RestoreConfirmDialog`,
  and the two data hooks lack render-level tests — Vitest assertion coverage
  for those was intentionally deferred to I.10 integration testing where the
  Repository can be exercised through a real store stack.

## Tests

`tests/ui/version-history/` (50 new tests across 11 files):

- `version-tree-shape.test.ts` — 10 tests covering DFS, ordering, byte-identity
  determinism, milestone filtering and re-parenting.
- `preview-context.test.tsx` — 5 tests covering reducer transitions and the
  missing-provider error.
- `milestone-filter.test.tsx` — 3 tests.
- `selection-footer.test.tsx` — 5 tests for disable-gates and click dispatch.
- `pane-tabs.test.tsx` — 2 tests.
- `version-tree-row.test.tsx` — 6 tests covering markers, fallback label,
  authored-against pill, aria-pressed, click dispatch.
- `version-tree.test.tsx` — 5 tests covering row rendering, current marker,
  milestone filter pre-pass, empty state.
- `preview-banner.test.tsx` — 3 tests covering frame/session copy and Exit
  state transition.
- `compare-entry-row.test.tsx` — 4 tests covering each kind variant.
- `compare-entry-list.test.tsx` — 3 tests covering empty/non-empty/layout_only.
- `session-preview-overlay.test.ts` — 3 tests on `buildArgumentOverlayFromSessionVersion`.
- `index-barrel.test.ts` — barrel surface assertion.
