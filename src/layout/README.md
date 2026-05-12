# `src/layout/`

**Spec:** `docs/stream_i_layout_spec_v1.html`. **Coding session:** I.7 (2026-05-12).
ELK-based graph layout in a Web Worker. Pure-mapping core + Worker bridge. Imports `@/schema` only from the application codebase; `elkjs` is the sole third-party dependency. Imported by `@/ui` (canvas surfaces) to compute node positions on frame open and after structural edits.

## Public API surface

Barrel: `@/layout` re-exports the public surface from `index.ts`.

| Export                        | Description                                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout(frame, opts?, deps?)` | Main entry point. Returns `Promise<LayoutResult>`. Routes through a lazy singleton Web Worker; falls back to main-thread `runLayoutSync` when `Worker` is unavailable (Vitest in node, old browsers). |
| `terminate()`                 | Test-only. Terminates the Worker and clears in-flight requests.                                                                                                                                       |
| `LayoutPosition`              | `{ node_id: NodeRef; x: number; y: number }` — one position per visible node.                                                                                                                         |
| `LayoutResult`                | `{ positions: LayoutPosition[]; width: number; height: number; computed_at: string }` — positions sorted by `node_id` for deterministic snapshot equality.                                            |
| `LayoutOptions`               | `{ direction: "DOWN" \| "RIGHT"; honor_user_anchors: boolean; collapse_subquestions: boolean }` — all fields have sane defaults.                                                                      |
| `LayoutDeps`                  | `{ now?: () => string }` — optional clock injection for test determinism.                                                                                                                             |
| `DEFAULT_LAYOUT_OPTIONS`      | `{ direction: "DOWN", honor_user_anchors: true, collapse_subquestions: true }`.                                                                                                                       |

### Signature deviation from `stream_i_contracts_v1.html`

Contract 5 declares `layout(frame, opts?)` with no clock-injection parameter. This module refines the signature to `layout(frame, opts?, deps?)` where `deps.now` is used for `LayoutResult.computed_at`. Production callers omit `deps`; tests pass a frozen-clock stub. Same F-003-family pattern as I.3/I.4/I.5/I.6; logged as in-session flag from I.7 for a future contracts-doc bump.

## How the UI consumes this module

The canvas component imports `layout` and calls it in a `useEffect` keyed on `frameVersion.id` + `opts`. The resolved `LayoutResult.positions` are patched into React Flow's node position state in a single update. Stale results (a newer layout request started before this one resolved) are discarded at the UI layer by checking the FrameVersion id, not at the bridge. The Stream E "auto-arrange" command calls `layout(frame, { honor_user_anchors: false })`; the UI does **not** persist those positions back to the frame — anchor persistence happens only on user drag (via a `node_updated` action in `@/modes` that sets `presentation.x` / `presentation.y`).

## Determinism contract

Off the Article II § 2 boundary, but practically deterministic: identical `FrameVersion` + identical `LayoutOptions` + identical `deps.now()` produce identical `LayoutResult`. Four mechanisms: (1) sorted input to ELK, (2) `elk.layered.considerModelOrder.strategy = NODES_AND_EDGES`, (3) deterministic ELK layered algorithm, (4) injected clock. Anchored nodes (`presentation.x/y` set + `honor_user_anchors: true`) are post-processed to their exact anchor coordinates after ELK runs. Snapshot tests in `tests/layout/` pin the property.

## Tests

Vitest acceptance tests live in `tests/layout/`; see `stream_i_layout_spec_v1.html` for the full test plan and behavioral contracts. Each test file uses `vi.useRealTimers()` in `beforeEach` because ELK's internal scheduling requires `setTimeout` to be real.
