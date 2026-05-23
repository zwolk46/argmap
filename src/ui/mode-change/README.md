# ui/mode-change

Mode-change dialogs reached from `FrameSettingsPanel`: heavy architectural-mode
change (legal ↔ general) and lighter flavor-change (personal ↔ academic).

**Spec:** retired 2026-05-23 (was `docs/stream_i_ui_mode_change_migration_spec_v1.html`); this README is now the source of truth.
**Coding session:** I.9d2 (2026-05-12).

## Public API

```typescript
import {
  ArchitecturalModeChangeDialog,
  FlavorChangeDialog,
  buildModeChangeSummary,
} from "@/ui/mode-change";
```

| Surface                         | Role                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ArchitecturalModeChangeDialog` | Mounted page-locally by `FrameBuildingPage`. Stages target mode + flavor + per-Conclusion direction resolutions + optional new positions, then commits one atomic `architectural_mode_changed` `FramePatch`. |
| `FlavorChangeDialog`            | Light `ConfirmDialog` wrapping `scanFlavorChange` advisories; commits immediately via `metadata_edited({ flavor })`.                                                                                         |
| `buildModeChangeSummary`        | Pure helper producing the canonical change_summary string per E6.                                                                                                                                            |

## Sub-modules

| File                                   | Purpose                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `architectural-mode-change-dialog.tsx` | Top-level dialog; owns staging state; gates Commit on all blocking items resolved + positions present (if needed).        |
| `target-mode-picker.tsx`               | Read-only current label + target label; flavor radios appear only when target = general.                                  |
| `positions-inline-editor.tsx`          | Conditional editor surfaced when target = general and no positions exist; uses injected `generateId`.                     |
| `scan-result-body.tsx`                 | Renders the modes-layer `TransitionResult` as blocking section (with inline editors) + advisory section.                  |
| `conclusion-direction-editor.tsx`      | Per-Conclusion editor row; constructs `{ kind: "legal", value }` or `{ kind: "general", position_id }`.                   |
| `advisory-list.tsx`                    | Groups `ValidationResult[]` by rule_id preserving first-occurrence order.                                                 |
| `flavor-change-dialog.tsx`             | Confirms flavor switch with scanFlavorChange's advisories.                                                                |
| `use-mode-change-scan.ts`              | Memoizes `attemptTransition('architectural', ...)` on a stable input tuple; exposes `rescan()`.                           |
| `change-summary.ts`                    | Pure `buildModeChangeSummary(current_mode, current_flavor, target_mode, target_flavor)` producing the E6 string template. |

## Import boundary

Per `src/ui/` substrate: types and functions consumed via `@/state` re-exports
(`attemptTransition`, `scanFlavorChange`, `TransitionResult`,
`ConclusionDirectionEditor`). No direct value-imports from `@/modes`. Mutations
go through `frame_store.getState().applyPatch(...)`.

## State-layer additions (F-007)

- `FramePatch` gained `architectural_mode_changed` kind with payload
  `{ target_mode, target_flavor?, positions_added?, conclusion_direction_resolutions, change_summary }`.
- `metadata_edited.partial` Pick tuple gained `flavor`.
- `FrameActionDispatchTable.architectural_mode_changed` implements the atomic
  transform (in the modes module, dispatched via the state layer).
- `@/state` re-exports `attemptTransition`, `scanFlavorChange`,
  `scanArchitecturalModeChange`, `TransitionResult`, `ConclusionDirectionEditor`.

## Tests

`tests/ui/mode-change/` (20 tests across 6 files): `change-summary`,
`target-mode-picker`, `positions-inline-editor`, `conclusion-direction-editor`,
`scan-result-body`, `advisory-list`.
