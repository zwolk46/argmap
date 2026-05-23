# ui/argument-running

Argument-running UI — the run-through interview, the three-tab output viewer, the
per-item editors, and the bottom panel (premise pool + session authorities).

**Spec:** retired 2026-05-23 (was `docs/stream_i_ui_argument_running_spec_v1.html`); this README is now the source of truth. **Coding session:** I.9c (2026-05-12).

## Public API

```typescript
import { ArgumentRunningPage } from "@/ui/argument-running";
// or from the top-level barrel:
import { ArgumentRunningPage } from "@/ui";
```

### `ArgumentRunningPage`

```typescript
interface ArgumentRunningPageProps {
  session_id: SessionId;
  on_open_migration_dialog?: () => void; // wired by I.9d
  on_toggle_version_history?: () => void; // wired by I.9d
  version_history_open?: boolean;
}
```

The top-level page composition. Mounts `TopBar` (with drift indicator + status summary
chips), the two-pane layout (`InterviewPane` left, `OutputViewer` right, `BottomPanel`
bottom), the per-item editor host, the AI suggestion drawer (`store_kind="session"`),
and the help/glossary pane. Loads the session via `session_store.loadSession` and the
parent frame via `frame_store.loadFrame` on mount.

## Sub-module structure

| Directory         | Purpose                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interview-pane/` | `InterviewPane` shell + filter strip + search + `InterviewList` (partitioned jurisdictional / merits) + `InterviewRow` + `RecomputeIndicator` + `InterviewEmptyState`                                                       |
| `output-viewer/`  | `OutputViewer` shell with three tabs: `PathOverlayTab` (wraps `FrameCanvas`), `DecisionTreeTab` (pure-SVG layout from `selectOutputForView(.., "decision_tree")`), `ProseTab` (canonical + optional G6 rewritten)           |
| `item-editors/`   | `ItemEditorHost` dispatch + per-type `CheckpointItemEditor` / `TermItemEditor` / `InterpretationItemEditor` + shared `PremiseAuthoringSection` (with `PremiseReuseSuggestions`), `AuthorityAttachmentSection`, `NotesField` |
| `bottom-panel/`   | Collapsed-by-default panel with `PremisePool` and `SessionAuthorities` lists; rows expose edit / delete (cascade-confirm if attached edges exist) / highlight-on-canvas affordances                                         |

## State-layer additions (F-022)

The I.9c session widened the state module's import boundary to allow `@/modes`
(non-type) imports so `selectInterviewItems` can wrap `computeInterviewOrder`. Five
new selectors land in `@/state`:

- `selectInterviewItems(snapshot)` — wraps `computeInterviewOrder`; returns `[]`
  when there's no session or compute_result.
- `selectStatusSummary(snapshot)` — `{ shape, resolved_count, total_count,
conclusion_label? } | null`. The pre-I.9c selector of the same name was renamed
  `selectNodeStatusCounts`.
- `selectFrameVersionDrift(session_snapshot, frame_snapshot)` — `{ has_drift,
session_version_number, current_version_number } | null`. Cross-store selector
  taking both snapshots so it can compare version ids.
- `selectOutputForView(snapshot, tab)` — `OutputViewPayload | null` for one of the
  three tabs (`path_overlay` / `decision_tree` / `prose`). The prose payload
  surfaces the canonical `prose_summary` plus `session_version.output_overrides.rewritten_prose`
  (F-002).
- `selectStatusBadge(snapshot, node_id)` — `StatusBadgeData | null`.

The `InterviewItem` type is re-exported from `@/state` for I.9c consumers.

## Key implementation decisions

### SessionPatch contract divergences from the spec

The I.9c spec describes Checkpoint and Interpretation editors as embedding new
premises directly into their patches. The actual `SessionPatch` union in
`@/state/action-runner.ts` requires premises to be created via a separate
`premise_added` patch first; the answer patches reference premises by id only:

- `checkpoint_answered`: `{ node_id, answer: { selected_option_id, premise_id, notes? } }`
- `interpretation_selected`: `{ term_id, interpretation_id: NodeRef | null }` (single-select)

Editors dispatch `premise_added` first, then the answer patch with the new premise's
id. The auto-save debounce (Stream H H2) collapses the two patches into one
persisted version.

### `interpretation_selected` is single-select in v1

The spec describes multi-select for `interpretation_selected`. The actual patch
contract is single-select (`interpretation_id: NodeRef | null`). The Term editor
renders a single-select radio group; multi-select reservation is a v1.x extension.

### `ConditionalOutput.shape` enum

The canonical enum is `"determinate" | "conditional" | "contested" | "incomplete"`.
The status summary chip maps these to user-facing labels:

- `determinate` → "complete · {conclusion_label}"
- `conditional` → "{N}/{M} resolved · tentative: {conclusion_label}"
- `contested` → "contested" (optionally with conclusion_label)
- `incomplete` → "indeterminate"

### Migration dialog placeholder

`FrameVersionDriftIndicator` opens a placeholder `Dialog` when clicked. I.9d will
swap the placeholder for the real session-migration UI by passing
`on_open_migration_dialog` through `ArgumentRunningPageProps`.

### Path-overlay tab uses real `FrameCanvas`

`PathOverlayTab` mounts `FrameCanvas` in `argument_running` operating-mode with
ELK layout, the runtime's `status_map`, and the synthesized `ArgumentOverlay`
(ANSWERS / SUPPORTS / CONTRADICTS edges only, sorted by id).

### Authority attachment is collected but not always persisted in v1

The Checkpoint and Interpretation editors collect an optional `authority_id` from
`AuthorityAttachmentSection`, but the `SessionPatch` surface only exposes the
authority indirectly: `checkpoint_answered` references a `premise_id`, and
`argument_edge_added` carries source/target/type with no `authority_ref` field.
Creating a session-scoped Authority does dispatch `session_authority_added`, so
the Authority itself is persisted, but the link between the chosen Authority and
the answering Premise is not stored in v1. I.9d will close this loop (likely via
an additive Premise field or a CITES edge).

### `AiAttributionChip` divergence

The spec references `AIAttributionChip variant="rewritten"`. The actual primitive
accepts either a full `HookInvocationRecord` (rich tooltip with model / prompt
version / generated-at) or a bare `hook_id` (chip with no tooltip — §12 F-22).
`ArgumentSessionVersion.output_overrides.rewrite_invocation` (§12 F-09) now
carries the record so the prose-tab chip can render the rich tooltip when the
record is present, and falls back to hook-id-only attribution otherwise. The
field is populated by the `apply_decision` shim — not yet wired in `main.tsx`
— so until that wiring lands the chip silently no-ops to the hook-id-only mode.

## Import boundary

Inherits the `src/ui/` substrate's boundary: no value imports from `@/runtime`,
`@/persistence`, `@/modes`, or `@/llm-hooks` (type-only imports allowed for
`@/runtime` and `@/llm-hooks`). All mutations flow through
`useRepository().{session_store,frame_store,app_state_store}.getState().*`.

## Tests

Tests live in `tests/ui/argument-running/` (73 new tests across 14 files):

- Pure-function tests for `passesFilter`, `searchMatches`, `buildBreadcrumb`,
  `statementPreviewFor`, `rankPremiseReuse`, `countAttachedEdges`,
  `layoutDecisionTreeBranches`, `buildArgumentOverlayProjection`,
  `proseToMarkdown`, `authorityPickerVisible`, and `listTermInterpretations`.
- Component renders for `TwoPaneLayout`, `StatusSummaryChip`, `OutputViewTabs`,
  `DecisionTreeTab`, and `ProseTab`.
- Selector tests in `tests/state/argument-running-selectors.test.ts` cover
  `selectStatusSummary`, `selectInterviewItems`, `selectFrameVersionDrift`,
  `selectOutputForView`, and `selectStatusBadge`.

1306 total tests pass across 116 test files.
