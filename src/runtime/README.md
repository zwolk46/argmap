# `src/runtime/`

**Spec:** `docs/stream_i_runtime_spec_v1.html`. **Coding session:** I.3 (2026-05-12).
The runtime is the determinism boundary of the application (Article II § 2). It
imports only `@/schema` and standard built-ins; it is pure, clock-free, and
contains no randomness.

## Public surface

Barrel: `@/runtime`.

| Export                                                                                            | Source                 | Role                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `compute(input)` / `compute(frame_version, session, computed_at?, jurisdiction_default?)`         | `compute.ts`           | The orchestrator. Composes the five phases (validate → foreclosure → reachable+active → status → output). Pure. |
| `ComputeInput`, `ComputeResult`                                                                   | `compute.ts`           | Cross-module shapes (Contract 2).                                                                               |
| `isBinding(authority, target_jurisdiction)`, `BindingResult`, `BindingSource`, `BindingCertainty` | `authority-binding.ts` | C6 authority-binding determination. F5 stub branch reserved (`F5_AVAILABLE === false` in v1).                   |
| `computeCascadeReport(frame_version, to_delete)`, `CascadeReport`, `CascadeReason`                | `extras.ts`            | F-004 cascade-delete report for the modes layer.                                                                |
| `enumerateOrphanCandidates(session_version, target_frame_version)`, `OrphanCandidate`             | `extras.ts`            | F-007 pre-migration orphan analysis.                                                                            |
| `rankPremiseReuse(candidates, context)`, `PremiseReuseSuggestion`                                 | `extras.ts`            | Deterministic Jaccard + lex-id ranking.                                                                         |
| `sortedIter`, `sortedKeys`, `sortedEntries`, `sortedBy`                                           | `iteration-helpers.ts` | Re-exported for tests. Application modules generally do not call these.                                         |

## What downstream sessions should know

- **`computed_at` is required input** (extension to Contract 2). The runtime never reads `Date.now()` or the wall clock; callers thread a logical timestamp into every `NodeStatus.evaluated_at` and `ConditionalOutput.computed_at`. The state layer's natural sources are `ArgumentSessionVersion.created_at` or `ArgumentSession.updated_at`. In tests, pin to a constant. This is an in-session-escalated flag (logged in `docs/flags.html`); the schema and runtime specs are canonical, contracts v2 needs an additive bump.
- **Mode/flavor are inferred from FrameVersion content.** `FrameVersion` does not carry `Frame.mode` / `Frame.flavor` / `Frame.default_satisfaction_policies`. The runtime infers legal mode from presence of any `ConclusionDirection.kind === "legal"`; flavor is inferred from `Premise.kind` distribution (academic by default). This affects only the `burden_met` kind-weight tables; unmatched kinds default to weight 30, so flavor-mismatch is benign. **State / modes / persistence sessions that hold the parent `Frame` should pass `mode`/`flavor` explicitly** — a future minor signature extension on the condition surface will accept them. For now the inference is documented and tested.
- **Satisfaction policies fall back to the library defaults** (`DEFAULT_SATISFACTION_POLICIES` from `@/schema/satisfaction-policy`). Per-instance `Node.options_box` overrides are honored; frame-level defaults from `Frame.default_satisfaction_policies` are not visible at the runtime layer (they are not on `FrameVersion`). If a future session needs frame-default behavior, the cleanest extension is to widen `ComputeInput` with an optional `frame_default_policies` field.
- **`NodeStatus.failed_conditions` are plain strings.** The marker `gate_evaluated_not_satisfied` (exported as `GATE_NOT_SATISFIED_MARKER` from `gates.ts` / re-exported from `status.ts`) is how the gate evaluator propagates a definitive not-satisfied signal up through chained gates. Other markers: `"inputs_indeterminate"`, `"contradicting_premises"`, `"any_of_group_unsatisfied"`, plus the kind names of failed conditions (e.g., `"burden_met"`).
- **F-001 wiring point.** `burden_met` reads `frame_version_snapshot.llm_settings_snapshot?.calibrated_thresholds` and falls back to `DEFAULT_BURDEN_THRESHOLD`. The runtime never invokes G5 or any LLM — calibration arrives as static data.
- **F-002 NOT in the runtime.** G6 prose-rewrite lives on `ArgumentSessionVersion.output_overrides` and is consulted only by the Stream E prose tab. `compute` neither reads nor writes that field.
- **Two-pass active set.** Phase 3 first computes `active_set` with an empty `status_map` (gates with unresolved inputs do not route). Phase 4 then computes the status map. Phase 3 reruns with the populated status map for phase 5's output generation. This is deterministic and acyclic; an iterative fixpoint is reserved for v2.
- **Branch ids use SHA-256** of `node_id::option_id` (or `gate_id::slot::value`), prefixed with `br_`. Stable across runs.
- **`buildGraph` synthesizes routing edges** for `CheckpointOption.target_node_id` (`OPTION_LEADS_TO`) and `LogicalGate.output_target` (`GATES`). Traversal code never special-cases these patterns; the synthetic edges carry `synthetic: true`.

## What to avoid breaking

- **The runtime boundary.** `eslint.config.js` blocks imports from `@/persistence`, `@/ui`, `@/state`, `@/llm-hooks`, `@/modes`, `@/layout`, plus `react`, `dexie`, `zustand`, `elkjs`, `@xyflow/react`. Adding any of these to a runtime file is an Article II § 2 violation.
- **The sort-before-iterate discipline.** Every `Set` / `Map` / object iteration goes through `iteration-helpers.ts`. Iteration over arrays is fine but order-sensitive consumers should still go through `sortedBy`.
- **Pure `compute`.** No clock reads, no random, no environment branches, no LLM. The CI determinism gate (frozen-clock Vitest + iteration-order audit + the keystone snapshot test in `tests/runtime/compute.determinism.test.ts`) holds the line.
- **`F5_AVAILABLE = false`** is the v1 contract. The F5 wire-in session flips it to `true` and populates `queryF5Binding`; `BindingResult.source: "hierarchy_database"` is the slot reserved for that branch.
- **Public surface only in the barrel.** `index.ts` re-exports only `compute`, `ComputeInput`, `ComputeResult`, the iteration helpers, `isBinding` / `BindingResult` / `BindingSource` / `BindingCertainty`, and the F-004 / F-007 helpers. Other internals (graph projection, per-phase functions, the per-condition implementations) are private and may change without notice.
