# ui/session-migration

Session-migration dialog reached from `FrameVersionDriftIndicator` in
`ArgumentRunningPage`. Loads `OrphanCandidate[]` from
`SessionStore.previewMigration`, lets the user override per-candidate
`OrphanResolution`s, then commits via `SessionStore.migrateToFrameVersion`.

**Spec:** `docs/stream_i_ui_mode_change_migration_spec_v1.html`.
**Coding session:** I.9d2 (2026-05-12).

## Public API

```typescript
import { SessionMigrationDialog } from "@/ui/session-migration";
```

| Surface                   | Role                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionMigrationDialog`  | Top-level dialog. Calls `previewMigration` on open; seeds defaults from `suggested_kind`; dispatches `migrateToFrameVersion` on Confirm. |
| `buildDefaultResolutions` | Pure helper that seeds a Map of resolutions from a candidates array.                                                                     |
| `partitionByKind`         | Pure helper that buckets candidates by `carrier_kind` preserving order.                                                                  |

## Sub-modules

| File                           | Purpose                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-migration-dialog.tsx` | Top-level Dialog. Five reducer-like phases: idle / loading / loaded(\_empty) / migrating / failed.                                                                                                  |
| `migration-dialog-body.tsx`    | Phase dispatch: loading spinner, empty state, grouped candidates (canonical kind order: checkpoint_answer, interpretation_selection, argument_edge, premise, session_authority), or failed + Retry. |
| `orphan-candidate-group.tsx`   | Per-`carrier_kind` group with section header + count.                                                                                                                                               |
| `orphan-candidate-row.tsx`     | Single candidate row with `display_summary` + `ResolutionPicker`; alternative-target select only when there are 2+ reattach candidates.                                                             |
| `resolution-picker.tsx`        | 3-option SegmentedToggle (Discard / Reattach / Keep as no-op).                                                                                                                                      |
| `use-preview-migration.ts`     | Async hook around `session_store.previewMigration`; manages idle/loading/loaded/failed phase; retry-able.                                                                                           |

## State-layer additions (F-007)

- `SessionStore.previewMigration(target_frame_version_id)` already exists
  (returns `OrphanCandidate[]`).
- `SessionStore.migrateToFrameVersion(target_id, resolutions)` added: wraps
  `repository.migrateSession`, reloads session, re-runs compute.
- `@/state` re-exports `OrphanCandidate` from `@/runtime` and `OrphanResolution`
  from `@/persistence` so the UI consumes through the state-as-broker boundary.

## Import boundary

Per `src/ui/` substrate: no direct value-imports from `@/persistence`,
`@/runtime`, `@/modes`, or `@/llm-hooks`. All persistence and modes types reach
the UI through `@/state` re-exports.

## Tests

`tests/ui/session-migration/` (14 tests across 4 files):
`resolution-picker`, `orphan-candidate-row`, `use-preview-migration`
(`buildDefaultResolutions`), `migration-dialog-body` (`partitionByKind` +
phase rendering).
