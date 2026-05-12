# `src/schema/`

**Spec:** `docs/stream_i_schema_spec_v1.html`. **Coding session:** I.2 (2026-05-12).
The schema module is the dependency root: every other module imports from it,
and it imports nothing from the application codebase.

## Public surface

Barrel: `@/schema` re-exports everything from the nine source files.

| File                     | Exports                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identifiers.ts`         | `NodeRef`, `EdgeRef`, `FrameId`, `FrameVersionId`, `SessionId`, `SessionVersionId`, `HookId` (string aliases; no branding in v1).                                                                                                                                                                                                                                                                             |
| `nodes.ts`               | `Node` discriminated union (discriminator `type`) over `RootQuestion`, `SubQuestion`, `Term`, `Interpretation`, `Checkpoint`, `LogicalGate`, `Conclusion`, `Authority`, `Premise`. `CheckpointOption`, `CheckpointAnswerType`, `BurdenLevel`, `ConclusionDirection`, `PremiseKind`, `NodeBase` (with nested `presentation`), gate sub-union with named slots, full set of `is*` guards, `isBooleanEvaluable`. |
| `edges.ts`               | `Edge` discriminated union (12 types), `EdgeBase`, `VALID_EDGE_PAIRS` (V-EDGE-1 source data; consult to filter the edge-type picker per source node type).                                                                                                                                                                                                                                                    |
| `frame.ts`               | `Frame`, `FrameVersion`, `Mode`, `Flavor`, `Jurisdiction`, `Position`, `LlmSettings`, `HookInvocationRecord`, `BurdenThresholdMap`, `PREMISE_KIND_VOCABULARIES`. `FrameVersion.llm_settings_snapshot` (F-001 G5 projection) is optional. `Frame.archived` is an optional additive flag (F-004 #4).                                                                                                            |
| `session.ts`             | `ArgumentSession`, `ArgumentSessionVersion`, `CheckpointResponse`, `InterpretationSelection`, `NodeStatus`, `ConditionalOutput`, `ConditionalBranch`, `BranchCondition`, `OpenGate`, `ConfidenceBreakdown`. `ArgumentSessionVersion.output_overrides` (F-002 G6 carrier) is optional. `ArgumentSession.archived` is an optional additive flag (F-008 #3).                                                     |
| `satisfaction-policy.ts` | `SatisfactionPolicy` (Stream B canonical: `all_of` required, `any_of` optional), 12-condition `Condition` union, `DEFAULT_SATISFACTION_POLICIES`, `resolveEffectivePolicy()` (per-instance replaces frame default replaces library default — no merging).                                                                                                                                                     |
| `validation-rules.ts`    | `Severity`, `ValidationResult`, `ValidationRule`, `VALIDATION_RULES` (the 39 rules: V-FR-1..12, V-NODE-1..9, V-EDGE-1..4, V-GATE-1..6, V-ARG-1..8), `runValidation(frame, session?, rules?)` (sorts rules lexicographically for determinism).                                                                                                                                                                 |
| `envelope.ts`            | `FrameExport`, `ArgumentSessionExport`, `CURRENT_APP_VERSION`.                                                                                                                                                                                                                                                                                                                                                |
| `migrations.ts`          | `Migration`, `MigrationRegistry`, `migrate()`, `CURRENT_SCHEMA_VERSION` (=1), `MIGRATION_REGISTRY` (empty at v1), `UnknownSchemaVersionError`.                                                                                                                                                                                                                                                                |

## What downstream sessions should know

- **Stream-B canonical names.** The schema follows the per-module spec, which
  resolved five TypeScript-precision divergences with contracts v1 (F-003).
  Contracts v2 partially applied those corrections; the remaining divergences
  are logged as F-011 in `docs/flags.html`. Downstream sessions import from
  `@/schema`, not contracts v2 verbatim, and pick up the canonical names:
  `SatisfactionPolicy.all_of` (not `conditions`), `Condition.premise_kind_in.kinds`
  (not `allowed`/`allowed_kinds`), `NodeStatus`/`OpenGate` exported from
  `@/schema/session` (not `@/runtime`), and `Node.presentation?.{x,y,collapsed}`
  (nested, not flat).
- **V-FR-8 treats `CheckpointOption.target_node_id` as a virtual outgoing
  edge.** Checkpoints have no valid LEADS_TO source role (V-EDGE-1), so the
  path-termination check synthesizes outgoing edges from each option's
  `target_node_id` when present.
- **V-NODE-8** requires `target_node_id` to be non-null whenever `satisfies` is
  true; no "terminal-answer escape" via a LEADS_TO from the Checkpoint.
- **V-FR-7 and V-ARG-3 infer mode** from the FrameVersion snapshot: presence of
  any `ConclusionDirection.kind === "legal"` means legal mode. Frame-level mode
  is not on `FrameVersion` (it lives on `Frame`); rules that need it inspect the
  conclusions. Downstream modules that hold the parent `Frame` should pass mode
  through their own validation surface.
- **BINDING_IN** is in the `EdgeType` union for exhaustiveness in switch
  statements but never instantiated as an Edge row. The conceptual relation
  lives on `Authority.binding_in: Jurisdiction[]`. V-EDGE-1 / V-NODE-1 skip
  `BINDING_IN` Edge entries.
- **Determinism.** `runValidation` sorts the rule registry by id every call;
  rule bodies sort node and edge iteration lexicographically by id. Pure
  functions; no clock, no global state. Schema module imports nothing from the
  application codebase, so the runtime boundary is trivially respected by any
  caller.
- **Mode-aware fields are a strict superset on the type.** Legal-only fields
  (`standard_of_review`, `jurisdiction`, `is_binding`, `requires_authority`,
  `burden_level`, the legal branch of `ConclusionDirection`) are present on
  every shape regardless of mode. Validators ignore them in general mode;
  switching modes never invalidates a previously valid document.

## What to avoid breaking

- Field names on `SatisfactionPolicy`, `Condition.premise_kind_in.kinds`, and
  `NodeBase.presentation.{x,y,collapsed}` — F-011 will be the contracts bump to
  bring v2 fully into line; until then, the schema names are the canonical
  call sites.
- The 39 rule IDs in `VALIDATION_RULES` are a stable contract surfaced in the UI
  (Stream E validation panel). Renaming a rule ID is a breaking change.
- `CURRENT_SCHEMA_VERSION = 1` and the empty `MIGRATION_REGISTRY.migrations` are
  the v1 contract. The next session that introduces a schema-breaking field
  adds entry `1: migrate_v1_to_v2` and bumps `CURRENT_SCHEMA_VERSION` to 2.
- `Frame.archived` and `ArgumentSession.archived` are optional (additive) and
  default to `false` at the app layer (state / persistence sessions handle the
  default).
