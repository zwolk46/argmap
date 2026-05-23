# ui/home

Home page surface: pinned + recent frame cards + new-frame button (with reusable
`NewFrameWizard` from `@/ui/onboarding`). Replaces the I.9a placeholder HomePage
in `app-routes.tsx`.

**Spec:** retired 2026-05-23 (was `docs/stream_i_integration_spec_v1.html` § 1 — Home page module); this README is now the source of truth.
**Coding session:** I.10 (2026-05-12).

## Public API

```typescript
import {
  HomePage,
  FrameSummaryCard,
  relativeTime,
  EMPTY_COPY,
  type HomePageProps,
  type FrameSummaryCardProps,
  type FrameSummary,
} from "@/ui/home";
```

| Surface            | Role                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HomePage`         | Page-level composition. Reads `app_state.recents`, `app_state.pinned`, and `frames` from `AppStateStore`. Calls `app_state_store.loadFrames()` on mount.       |
| `FrameSummaryCard` | Card primitive: title button (opens via `navigate({ kind: "frame_building", frame_id })` + `setRecent`), `ModeFlavorChip`, relative timestamp, ★/☆ pin toggle. |
| `relativeTime`     | Pure helper: "Ns ago" / "Nm ago" / "Nh ago" / "Nd ago".                                                                                                        |
| `EMPTY_COPY`       | Frozen empty-state copy `{ title, body }`.                                                                                                                     |

## Sections (internal, not exported)

- **Pinned**: horizontal-scroll row of pinned cards. Hidden when empty.
- **Recents**: responsive grid (`grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`) of the 20 most recent non-archived non-pinned frames.
- **NewFrameButtonRow**: "+ New frame" header button → opens `NewFrameWizard` in a `Dialog`. On submit: `createFrame` then navigate.
- **HomeEmptyState**: rendered when both pinned and recents are empty.

## State / Repository consumption

- Reads `app_state.recents`, `app_state.pinned`, and `frames` from `AppStateStore`.
- `app_state_store.loadFrames()` on mount.
- `app_state_store.setRecent(frame_id)` on card open.
- `app_state_store.pinFrame(frame_id, pinned)` on ★ click.
- `app_state_store.createFrame({ title, mode, flavor })` on wizard submit.

The home-page-side dedupe rule: a frame appearing in both `pinned` and `recents`
is shown only in the Pinned row. The selector `selectPinnedFrames(frames, pinned)`
remains a peer helper exported from `@/state` for non-Home consumers.

## Tests

`tests/ui/home/` (7 tests across 1 file): `frame-summary-card` (relativeTime
pure helper + render assertions).

## Scope deferred (per session budget)

- Search section (`HomeSearchRow` + `SearchResultsSection`): the spec specs an
  in-place search-replaces-recents pattern. Not implemented in v1; the search
  box is reserved for v1.5 polish.
- "+ New frame from template" pre-positioned at the template step
  (`start_at_template_step` prop on `NewFrameWizard`): the wizard's v1 single
  form already supports template-less new-frame creation; template flow is
  v1.5.
- Show more / DEFAULT_RECENTS_CAP pagination beyond 20 items: the current grid
  caps at 20; a "Show more" affordance is a polish-pass addition.
