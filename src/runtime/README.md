# `src/runtime/`

**Spec:** retired 2026-05-23 (was `docs/stream_i_runtime_spec_v1.html`); this README is now the source of truth. **Coding session:** I.3 (2026-05-12).
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
- **Mode / flavor / default policies / jurisdiction are snapshotted onto FrameVersion (F-028).** `FrameVersion` now carries optional `mode`, `flavor`, `default_satisfaction_policies`, and `jurisdiction_default` fields. The action runner stamps these from `next_frame` at every version mint so the runtime computes purely from `FrameVersion + ArgumentSession` (Article II § 2). For legacy on-disk FrameVersions written before F-028, the runtime falls back to content inference for `mode`/`flavor` (legal iff any `ConclusionDirection.kind === "legal"`; personal iff observation/value/assumption premises outnumber empirical/definitional/normative). Frame-default policies on legacy versions fall through to library defaults.
- **Satisfaction policies are resolved via `resolveEffectivePolicy(node.type, node.options_box, frame_version.default_satisfaction_policies?.[node.type])` (F-028).** Per-instance overrides beat frame defaults; frame defaults beat library defaults. The compute path consults the FrameVersion snapshot, so restoring an older version preserves the policy that was in effect at that version's mint time.
- **`compute_driver` threads `FrameVersion.jurisdiction_default` into `ComputeInput.jurisdiction_default` (F-028).** Without this, `authority_binding` would always see `undefined` and the legal-mode binding-authority chain would be unreachable — silently neutering an editable Frame field. The snapshot lives on FrameVersion, so version restore preserves the jurisdiction in effect at that version's mint time.
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
