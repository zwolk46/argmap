# `src/modes/`

**Spec:** retired 2026-05-23 (was `docs/stream_i_modes_spec_v1.html`); this README is now the source of truth. **Coding session:** I.6 (2026-05-12).
The modes module implements the action orchestration layer: the `FrameActionDispatchTable`
and `SessionActionDispatchTable` entries, four async `Repository`-composite wrappers,
the transition gating function, the interview-order algorithm, and the cascade utility.

## Import boundary

`src/modes/` may import from `@/schema`, `@/runtime`, `@/persistence`. Only `@/state`
(and downstream `@/ui`) imports from `@/modes`. Enforced by ESLint (`no-restricted-imports`).
`src/modes/` does NOT call `compute()` internally — modes is pure or delegates to Repository.

## Public API surface

Barrel: `@/modes`.

---

### Dispatch tables

```typescript
import { frameActions, sessionActions } from "@/modes";
// Passed to RepositoryProvider and runFrameAction / runSessionAction in @/state.
```

`frameActions: FrameActionDispatchTable` — 10 entries covering all `FramePatch` kinds.
`sessionActions: SessionActionDispatchTable` — 12 entries covering all `SessionPatch` kinds.

`node_removed` throws `CascadeConfirmationRequired` when the cascade is non-trivial and
`patch.cascade` is absent. The caller must surface the report to the user and re-dispatch
with `patch.cascade` populated from the user's confirmation.

---

### Cascade

```typescript
import { computeDeletionCascade, previewNodeDeletion, CascadeConfirmationRequired } from "@/modes";

const report = computeDeletionCascade(frame_version, target_node_id);
// { deleted_node_ids: NodeRef[]; deleted_edge_ids: EdgeRef[] } — both sorted.
```

Algorithm: `R1 ∖ R2 ∪ {target}` where R1 = BFS reachability from RootQuestion (full graph)
and R2 = BFS reachability without the target node. Structural edges: DECOMPOSES_INTO,
TURNS_ON, INTERPRETED_AS, LEADS_TO, GATES. Gate named-slot inputs and CheckpointOption
`target_node_id` fields also count as structural.

---

### Transitions

```typescript
import { attemptTransition, scanArchitecturalModeChange, scanFlavorChange } from "@/modes";

const result: TransitionResult = attemptTransition(kind, current, target, precomputed?);
// { ok: boolean; blocking: ValidationResult[]; advisory: ValidationResult[]; inline_editors? }
```

Four kinds: `frame_to_argument` (gated by validation errors), `argument_to_frame` (always ok,
drift advisory), `architectural` (blocks on direction mismatch, emits `inline_editors[]`),
`flavor` (always ok, advisory for Authority visibility).

`frame_to_argument` throws if neither `precomputed.compute_result` nor `precomputed.validation`
is supplied — modes does not call `compute()`.

`current.positions?: Position[]` threads Frame-level positions into the architectural scan
for seeding general-mode inline editor options.

---

### Interview order

```typescript
import { computeInterviewOrder } from "@/modes";

const items: InterviewItem[] = computeInterviewOrder(frame_version, session, compute_result);
// Sorted: (1) is_jurisdictional desc, (2) dfs_order asc, (3) term_order asc, (4) node_id lex.
// First item has recommended_next === true.
```

DFS walks from RootQuestion using per-node-type branching: only selected Interpretations,
only chosen CheckpointOption targets, gate named-slot inputs in slot order.

---

### Orchestration wrappers

```typescript
import {
  createFrameFromTemplate,
  migrateSession,
  restoreFrameVersion,
  restoreSessionVersion,
  enumerateOrphanCandidates,
} from "@/modes";

const candidates: OrphanCandidate[] = enumerateOrphanCandidates(session, target_frame_version);
await migrateSession(repo, session_id, target_frame_version_id, resolutions);
```

Async wrappers are thin pass-throughs to `Repository` composite methods. `enumerateOrphanCandidates`
is synchronous and pure; call it before `migrateSession` to populate the UI's resolution list.
Reattach heuristic fires when exactly one same-type node with the same DECOMPOSES_INTO /
INTERPRETED_AS / TURNS_ON parent exists in the target.

## What downstream sessions should know

- **`CascadeConfirmationRequired`** carries `.report: CascadeReport` and `.target_node_id`.
  The UI presents the report and re-dispatches `node_removed` with `patch.cascade` set.
- **`frameActions` / `sessionActions`** are passed to `RepositoryProvider` as
  `frame_dispatch` / `session_dispatch` props (I.9 UI session wires this).
- **`LEGAL_DIRECTION_VALUES`** is exported and pinned to `ConclusionDirection` legal values in
  `@/schema`. Tests guard against drift (see transitions.test.ts).
- **`scanArchitecturalModeChange`** accepts `positions?: Position[]` — a spec divergence from
  Contract 4 (Frame.positions is Frame-level not FrameVersion-level). Logged under F-017.
- **No clock reads** anywhere in modes. The state layer threads `now` via `DispatchOpts`.
