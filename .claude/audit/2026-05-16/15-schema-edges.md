# Audit 15 — Schema correctness + edge cases at data boundaries

Scope: `/Users/zacharywolk/zwolk/argmap/src/schema/*.ts`, `/Users/zacharywolk/zwolk/argmap/src/modes/cascade.ts`, `/Users/zacharywolk/zwolk/argmap/src/modes/transitions.ts`, plus identifiers/migrations cross-cutting concerns.

Severity buckets:
- **critical** — silent data loss or determinism violation
- **high** — invalid data passes validation and reaches the runtime / persistence
- **medium** — type/contract weakness that creates ambiguity but is recoverable
- **low** — latent / cosmetic / future-only

---

## Critical

### F-1 — `migrate()` swallows missing/NaN `schema_version`
`/Users/zacharywolk/zwolk/argmap/src/schema/migrations.ts:28-48`

```
if (envelope.schema_version === registry.current_schema_version) return envelope;
if (envelope.schema_version > registry.current_schema_version) { throw ... }
let v = envelope.schema_version;
while (v < registry.current_schema_version) { ... }
```

When `envelope.schema_version` is `undefined`, `null`, `NaN`, or a string, neither equality check fires and the `>` check is `false`, so the `while (v < 1)` loop body never executes for `NaN`/`undefined`. The function then unconditionally writes `current.schema_version = registry.current_schema_version` at line 45 and returns. A hand-edited or third-party export with a missing/garbage version is silently stamped as v1 and accepted, even though no migration was actually performed.

Trigger: user imports an externally-provided JSON file with `"schema_version": null` (or it's missing). The downstream `saveFrame` accepts the migrated envelope as v1, even if its actual shape is v0/v2/unknown.

### F-2 — `crypto.randomUUID` fallback in `main.tsx` is not a valid v4 UUID
`/Users/zacharywolk/zwolk/argmap/src/main.tsx:38-43`

```
const rand = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
return `${rand()}${rand()}-${rand()}-4${rand().slice(1)}-${rand()}-${rand()}${rand()}${rand()}`;
```

The version nibble is hardcoded "4" but the variant nibble in the 4th group is NOT forced to `[89ab]` — it's an unconstrained random hex digit (so it produces non-conformant UUIDs ~75% of the time). Total entropy is also ~64 bits, not 122 (`Math.random()` is a double; only the mantissa carries randomness, and even less when re-clamped to 16 bits per call). The comment "won't collide at session scale" is optimistic given that node + edge IDs are minted hundreds of times per session, and the fallback fires on any browser without `crypto.randomUUID` AND without `crypto.getRandomValues` — exactly the environments least likely to detect collision. Trigger: an ancient browser without WebCrypto. Result: silently degraded uniqueness for every persisted id (NodeRef, EdgeRef, FrameId, …). The middle UUIDv4 branch (`getRandomValues`) at line 27-36 is fine.

### F-3 — `V-ARG-3` infers mode by walking Conclusions, ignoring F-028 snapshot fields
`/Users/zacharywolk/zwolk/argmap/src/schema/validation-rules.ts:1255-1258`

```
const isLegal = session.frame_version_snapshot.nodes.some(
  (n) => n.type === "Conclusion" && (n as Conclusion).direction.kind === "legal",
);
const vocab = vocabularyFor(isLegal ? "legal" : "general");
```

F-028 added `FrameVersion.mode`, `flavor`, `default_satisfaction_policies`, `jurisdiction_default` precisely to remove this inference (see `frame.ts:114-123` and `runtime/README.md` line about F-028). `V-ARG-3` still walks Conclusions and ignores `frame_version_snapshot.mode`. Consequence: a legal-mode frame with no Conclusion node yet (typical mid-construction state) classifies as general, so a legitimate `kind: "found"` premise reports as "not in the general_academic vocabulary". Same problem in `V-FR-7` (line 308-310). This is a direct contradiction of the snapshot fields that were added to make compute purely a function of `FrameVersion + ArgumentSession` (Article II § 2).

### F-4 — `Frame.default_satisfaction_policies` allows policies for Authority/Premise
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:87`

```
default_satisfaction_policies: { [K in NodeType]?: SatisfactionPolicy };
```

`NodeType` includes `Authority` and `Premise` (nodes.ts:5-14). The spec is explicit (satisfaction-policy.ts:41): "Premise and Authority have no policy (they are inputs / sources)." `DEFAULT_SATISFACTION_POLICIES` correctly limits keys to 7 types (line 42-50), but `Frame.default_satisfaction_policies` does not. Trigger: a buggy `default_policy_edited` patch with `node_type: "Authority"` (frame-actions.ts:223-236) is accepted and persists. `resolveEffectivePolicy()` (satisfaction-policy.ts:133-141) is keyed by `SatisfactionPolicyKey`, so even if the data is written, downstream lookups silently ignore the bogus entry — but it pollutes the persisted Frame and round-trips through export. Schema should be `{ [K in SatisfactionPolicyKey]?: SatisfactionPolicy }`.

---

## High

### F-5 — No validation that `CheckpointResponse.selected_option_id` or `AnswersEdge.selected_option_id` is a real option on the target Checkpoint
`/Users/zacharywolk/zwolk/argmap/src/schema/validation-rules.ts` (no rule for this), `session.ts:28-34`, `edges.ts:65-69`

`V-ARG-1` (line 1188-1211) only checks that `checkpoint_id` resolves to a node. `V-NODE-9` checks option-id uniqueness, but no rule cross-checks that `r.selected_option_id ∈ checkpoint.options.map(o => o.id)`. Trigger: a user edits a Checkpoint, deletes the option they previously selected, then re-opens an existing session with stale responses; the stale option id silently dangles. The runtime's `output` synthesizer (output.ts and friends) reads `selected_option_id` to find the satisfying `target_node_id` — a stale id produces no target, dropping the answer from the path with no warning.

### F-6 — `Premise.kind` is not refined by F-028 mode/flavor
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:201-220`

```
export type PremiseKind = "stipulated" | "found" | "disputed" | "procedural"
  | "empirical" | "definitional" | "normative"
  | "observation" | "value" | "assumption";
```

`PremiseKind` is the union of three disjoint vocabularies. Nothing on the Premise type itself ties the kind to the parent Frame's mode/flavor. `V-ARG-3` is the only gate, and it has the inference bug (F-3). Trigger: legacy data, hand-edited fixture, or LLM-output premise with `kind: "value"` (personal-only) lands in a legal frame; export/import round-trip preserves it; the runtime accepts it. The cross-vocabulary leak survives until the user changes mode, at which point the post-hoc validation flags it — never the action that produced it.

### F-7 — `scanArchitecturalModeChange` does not flag `Premise.kind` cross-vocabulary on mode toggle
`/Users/zacharywolk/zwolk/argmap/src/modes/transitions.ts:123-222`

The scanner walks Conclusion direction, `requires_authority`, `is_jurisdictional`, `standard_of_review`, and Authority fields. It never iterates Premises. After a legal→general toggle, every premise with `kind: "found"` / `"disputed"` / `"procedural"` is silently retained; the next validation pass against the now-general vocabulary fires `V-ARG-3` for every one of them. Trigger: user with answered checkpoints toggles Legal Mode off. The mode change appears successful; the validation panel then floods with "kind not in general_academic vocabulary" errors with no in-flow guidance.

### F-8 — `scanFlavorChange` does not flag `Premise.kind` cross-vocabulary on academic ↔ personal toggle
`/Users/zacharywolk/zwolk/argmap/src/modes/transitions.ts:224-256`

The scanner only emits Authority visibility advisories. The general_academic vocabulary (`empirical`, `definitional`, `normative`, `stipulated`) and general_personal vocabulary (`observation`, `value`, `assumption`, `stipulated`) overlap only at `stipulated`. Toggling academic↔personal silently strands every non-stipulated premise. Same trigger pattern as F-7. The architectural mode change and flavor change both blow past this contract.

### F-9 — `Authority.layer: "frame" | "argument"` is unchecked at validation
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:182-198`

Authority is the only node whose `layer` is multi-valued. No rule enforces that `Authority` nodes stored in `frame_version_snapshot.nodes` carry `layer: "frame"`, nor that ones in `session.session_authorities` carry `layer: "argument"`. Trigger: a programmatic edit (or fixture) places `layer: "argument"` on an Authority in the frame. Downstream code that filters by `layer === "frame"` silently drops it (see `frame-canvas.tsx` filtering); the runtime's reachability does not consider it.

### F-10 — `Edge.layer` and `Node.layer` are independent of `type` — no rule pins them
`/Users/zacharywolk/zwolk/argmap/src/schema/edges.ts:18-29`, `nodes.ts:16-33`, `validation-rules.ts:968-1010`

Every Edge interface declares `layer: "frame"` or `layer: "argument"` as a literal type (e.g., `DecomposesIntoEdge.layer: "frame"` at edges.ts:34), but at runtime the union forgets which branch it came from — a row with `type: "DECOMPOSES_INTO"` and `layer: "argument"` parses fine because the discriminated union narrows only on `type`. `V-EDGE-3`/`V-EDGE-4` check the storage location (`frame.edges` vs `session.argument_edges`) but not the field itself. Trigger: a manually edited JSON or a buggy migration sets `layer: "argument"` on a `DECOMPOSES_INTO` row; the file imports clean, but any consumer that branches on `e.layer` (e.g., overlay rendering at `session-preview-view.tsx:40-48`) misclassifies it. Same issue for Node.layer (Premise must be argument, Term must be frame, etc.).

### F-11 — `V-FR-10` only checks `position_id` is non-empty; cross-Frame consistency is unwired
`/Users/zacharywolk/zwolk/argmap/src/schema/validation-rules.ts:454-480`

```
description: "(general mode) Every Conclusion's direction.position_id resolves to a Position."
```

The implementation comment (line 461-463) admits: "positional consistency to Frame.positions is checked when the Frame is loaded alongside the FrameVersion at the Repository layer." Grep across `/Users/zacharywolk/zwolk/argmap/src/persistence/` and `/Users/zacharywolk/zwolk/argmap/src/state/` finds no repository-layer check actually wired. Trigger: a `position_id: "p-1"` Conclusion whose Frame has only `[{id: "p-2", ...}]` (e.g., the user deleted the Position via `positions-inline-editor.tsx`). The Conclusion now references a phantom position; `runtime/output.ts:127-135` renders the raw id string as fallback ("position p-1" appears in prose, with no validation error).

### F-12 — `vocabularyFor(general, undefined)` defaults to `general_academic`, ignoring frame flavor
`/Users/zacharywolk/zwolk/argmap/src/schema/validation-rules.ts:70-76`

```
function vocabularyFor(mode, flavor?) {
  if (mode === "legal") return "legal";
  return flavor === "personal" ? "general_personal" : "general_academic";
}
```

Every caller in this file (V-ARG-3 at line 1258) passes only the inferred mode and no flavor, so the function silently defaults to `general_academic`. A frame with `Frame.flavor = "personal"` will validate against the wrong vocabulary — a legitimate `observation`/`value`/`assumption` premise fails `V-ARG-3` ("not in the general_academic vocabulary"). Trigger: any personal-flavor general-mode frame. Even with F-028's `frame_version_snapshot.flavor`, V-ARG-3 doesn't read it (compounds F-3).

### F-13 — No rule guarantees `linked_to` Terms share the same `SubQuestion` parent
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:55-63`, `validation-rules.ts:736-759`

`V-NODE-4` only checks that `linked_to` targets a Term within the same FrameVersion; `V-NODE-3` checks no cycle. The conceptual contract of `linked_to` (shared interpretations across SubQuestions) is not enforced: a Term under Sub-A can `linked_to` a Term under Sub-B with entirely different INTERPRETED_AS children, and the runtime silently merges/replaces selections via `V-ARG-8`. Trigger: user copies a frame and edits one branch; the link is now semantically meaningless but valid.

### F-14 — `Checkpoint.options` permits empty array
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:92-102`, `validation-rules.ts:761-825`

The type is `options: CheckpointOption[]`. `V-NODE-5/6/7` check only that the count matches the `answer_type` — but a Checkpoint with `answer_type: "boolean"` and `options: []` fires V-NODE-5 ("has 0 options; expected 2") only as a warning-equivalent error and never blocks creation. More problematic: `CheckpointOption.id` and `.label` are both `string` with no min length — empty strings pass. Trigger: a Checkpoint editor with un-filled fields gets serialized, and the runtime's answer-lookup matches on an empty string id.

### F-15 — `cascade.ts` falls back to a trivial cascade when RootQuestion is absent
`/Users/zacharywolk/zwolk/argmap/src/modes/cascade.ts:77-88`

```
if (!root) {
  const deleted_edge_ids = frame.edges
    .filter(e => e.source === target || e.target === target)
    .map(e => e.id)...;
  return { deleted_node_ids: [target], deleted_edge_ids };
}
```

A frame in mid-construction can have no RootQuestion (or two — V-FR-1 only reports the violation; it doesn't prevent it). In that state, deleting any node skips the full reachability cascade entirely. Trigger: user deletes the Root, then deletes any other node — the cascade no longer removes orphaned downstream nodes; only edges touching the target are cleaned. Result: silently orphaned nodes that are then flagged by V-FR-2, but only after the second action.

---

## Medium

### F-16 — `MIGRATION_REGISTRY` is exported mutable
`/Users/zacharywolk/zwolk/argmap/src/schema/migrations.ts:10-15`

```
export const MIGRATION_REGISTRY: MigrationRegistry = {
  current_schema_version: CURRENT_SCHEMA_VERSION,
  migrations: {},
};
```

`MigrationRegistry.current_schema_version` is `readonly`, but `.migrations` is `{[from: number]: Migration}` and the whole exported object is `const` (binding) not `Readonly<…>` (shape). Any importing module can do `MIGRATION_REGISTRY.migrations[0] = somethingBuggy` at runtime. Trigger: a poorly-isolated test or an LLM-generated patch mutates the registry; subsequent imports produce non-deterministic output. The migration registry should be `Object.freeze`d.

### F-17 — `Migration` signature is `(unknown) => unknown` with no output validation
`/Users/zacharywolk/zwolk/argmap/src/schema/migrations.ts:1`

```
export type Migration = (input: unknown) => unknown;
```

A buggy or malicious migration step can return literally anything, and `migrate()` chains the next step blindly. No per-step shape check, no schema_version bump-by-step assertion, no envelope-shape assertion. Trigger: when a v2 migration is added in the future, a typo (e.g., missing `return current`) writes `undefined` to disk; importers see `migrated.frame` throw on property access at run time, not validation time.

### F-18 — `BurdenLevel`, `CheckpointAnswerType`, `PremiseKind`, `Jurisdiction.level` are not runtime-validated
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:75, 85-90, 201-211`, `frame.ts:17-22`

These are TypeScript string-literal unions only. At runtime, the import path (`migrate(envelope as unknown as …)` in `supabase-repository.ts:765-786`) casts straight to the typed shape — there is no zod/io-ts/structural validator. Trigger: imported JSON with `Jurisdiction.level: "Federal"` (wrong case) or `BurdenLevel: "preponderance_of_the_evidence"` (wrong slug). TS types lie; runtime accepts the bogus value; comparisons against the canonical strings fail silently.

### F-19 — `slug?: string` is undocumented and unconstrained on every NodeBase/EdgeBase/FrameBase
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:18`, `edges.ts:20`, `frame.ts:80`, `session.ts:97`

Four entities carry `slug?: string`. There is no slugify utility in `src/schema/`, no validation rule that slugs are unique within a Frame, no rule that they are non-empty / URL-safe, no rule for diacritic or emoji handling, and no reserved-word list. Trigger: a hand-rolled slug like `"foo bar"` or `"..//etc/passwd"` flows into URLs (if used by routing). Either remove the field or constrain it.

### F-20 — UUID and slug share the `string` id namespace — no protection against collision
`/Users/zacharywolk/zwolk/argmap/src/schema/identifiers.ts:1-7`

```
export type NodeRef = string;
export type EdgeRef = string;
export type FrameId = string;
...
```

The README declares "string aliases; no branding in v1". `slug?: string` is also a string field on the same nodes. Nothing prevents a node from being created with `id: "root"` (a slug-like string). If a future feature uses slugs as URL params and falls back to id-lookup, a slug that collides with another node's id resolves ambiguously. Trigger: low today (Supabase mints UUIDs), but the structure invites the collision.

### F-21 — `FrameVersion` snapshot fields (F-028) are optional and not marked `readonly`
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:99-124`

```
nodes: Node[];
edges: Edge[];
default_satisfaction_policies?: { [K in NodeType]?: SatisfactionPolicy };
jurisdiction_default?: Jurisdiction;
mode?: Mode;
flavor?: Flavor;
```

A `FrameVersion` is supposed to be the immutable historical record (`session.frame_version_snapshot` is a read-only preview at `session-preview-view.tsx`). None of these fields are marked `readonly`, and the arrays are not `ReadonlyArray<Node>`. Trigger: a runtime function that mutates `frameVersion.nodes.push(...)` or sets `frameVersion.mode = "general"` poisons the historical snapshot stored on every session that loaded that FrameVersion (JavaScript object identity). Snapshots should be `Readonly<FrameVersion>` at every API surface.

### F-22 — `Edge.label` field is undocumented and never validated
`/Users/zacharywolk/zwolk/argmap/src/schema/edges.ts:25`

`EdgeBase.label?: string` is present on every edge but has no rule, no UI editor referenced from spec, no role in any computation. It's a free-floating string field that exports/imports cleanly and is the kind of "what does this mean?" surface that tends to drift between sessions.

### F-23 — `ConclusionDirection.custom_label` allowed on both `legal` and `general` branches
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:151-168`

Both branches have `custom_label?: string`. The runtime's `renderDirection` (`output.ts:127-135`) only uses it on `legal` when `value === "custom"` (line 129), but on `general` it falls back to `custom_label` unconditionally (line 133). Trigger: user sets `value: "favors_plaintiff"` and `custom_label: "Plaintiff wins on remand"` — the label is silently dropped on legal, but if they later toggle to general (F-7 territory), the custom_label suddenly appears in output. No rule constrains this asymmetry.

### F-24 — `BindingInEdge` interface exists but never instantiated; no rule asserts it
`/Users/zacharywolk/zwolk/argmap/src/schema/edges.ts:93-96`, `validation-rules.ts:552-557, 893`

The README and code comment both say BINDING_IN is never instantiated as an Edge row, but the `BindingInEdge` interface is still in the `Edge` union (`edges.ts:115`) and `VALID_EDGE_PAIRS.BINDING_IN` is `{source_types: [], target_types: []}`. `V-EDGE-1` early-returns for `BINDING_IN` (line 893); no rule actively forbids creating one. Trigger: a stale migration or a legacy export contains a BINDING_IN edge row. It exists, passes all rules (because every check explicitly skips it), and slowly accumulates as zombie data.

### F-25 — `runValidation` lex-sorts rule ids — fragile if `V-FR-10..12` introduced (already present)
`/Users/zacharywolk/zwolk/argmap/src/schema/validation-rules.ts:42-48`

```
const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
```

Lex sort already orders today's IDs as: V-ARG-1, V-ARG-2, ..., V-ARG-8, V-EDGE-1..4, V-FR-1, V-FR-10, V-FR-11, V-FR-12, V-FR-2, ... — i.e., V-FR-10/11/12 sort *between* V-FR-1 and V-FR-2, not after V-FR-9. This is functionally fine today (rules are independent) but contradicts the README claim of "canonical ordering" by rule family. If any rule body depends on a sibling firing first (future foot-gun), this will silently misorder. A numeric secondary key would be safer.

### F-26 — `Frame.tags: string[]` and `Conclusion.tags?: string[]` have no constraints
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:88`, `nodes.ts:176`

Two tags fields, no normalization (case? trimming?), no uniqueness check within an array, no reserved-tag list. Trigger: a tag list `["torts", "Torts", " torts "]` is valid; downstream search/filter behaviors silently diverge. Low risk today (tags appear unused for compute) but the field permits drift.

### F-27 — `Term.order` is `number` with no constraint on range, sign, or uniqueness
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:55-63`

`order: number` — could be negative, fractional, NaN, Infinity, or duplicate of another Term's `order` within the same SubQuestion's TURNS_ON cluster. The interview-order algorithm sorts by `term_order asc` (`modes/README.md:80`); ties or NaN values are then resolved by lex id, but the spec implies a stable ordering contract that the schema can't enforce. Trigger: a clone/duplicate operation produces two terms with `order: 0`; the user-perceived order shifts inconsistently across sessions if id minting changes.

### F-28 — `CheckpointOption.target_node_id` is not constrained to a sensible target type
`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:77-83`, `validation-rules.ts:336-354`

`V-FR-8` treats `target_node_id` as a virtual outgoing edge but doesn't constrain *what type* it points at. `VALID_EDGE_PAIRS.LEADS_TO` (edges.ts:137-140) restricts `LEADS_TO` targets to `Checkpoint | SubQuestion | Conclusion | LogicalGate`, but `target_node_id` is unchecked. Trigger: a checkpoint option points at a Term or Authority; V-FR-8 happily traverses it (Authority has no outgoing structural edges, so the path then dies) and the answer "lands" on the wrong node type without warning.

### F-29 — `NodeStatus.via` array has no constraint on length, ordering, or duplication
`/Users/zacharywolk/zwolk/argmap/src/schema/session.ts:15-26`

```
via?: Array<"binding_authority" | "persuasive_authority" | "stipulation" | "structural_resolution" | "default">;
```

A status_map entry's `via` could be `["default", "default", "binding_authority"]`. No rule asserts uniqueness or canonical ordering. Article II § 2 determinism depends on rendering being a function of these values; duplicates produce visually different but structurally "equal" states.

---

## Low / latent

### F-30 — Determinism plugin coverage is narrow: only `src/runtime/`
`/Users/zacharywolk/zwolk/argmap/eslint-plugin-argmap-determinism/rules/no-unsorted-iteration.js:39-43`, `/Users/zacharywolk/zwolk/argmap/scripts/audit-iteration-order.mjs:18`

The rule fires on every file (`filename.includes("iteration-helpers")` exclusion only), but the audit script hardcodes `runtimeDir = join(repoRoot, "src", "runtime")`. ESLint coverage of `src/schema/` and `src/modes/` is contingent on the ESLint config — if `argmap-determinism/no-unsorted-iteration` is only applied to `src/runtime/*` (likely), then `schema/validation-rules.ts` and `modes/cascade.ts` are not covered by either gate. Several `Map`/`Set` iterations in `validation-rules.ts` (e.g., line 949-951 `for (const key of sortedIds(seen.keys()))`) are correctly sorted, but nothing prevents a future regression in `schema/` or `modes/`.

### F-31 — `audit-iteration-order.mjs` flags identifier substrings (false-positive prone)
`/Users/zacharywolk/zwolk/argmap/scripts/audit-iteration-order.mjs:20-25`

`\bObject\.keys\s*\(/g` will fire on, e.g., a comment `// see Object.keys for ordering`. The patterns are textual, not AST-based. Less critical (it's a CI guard), but means the audit is conservative and could mask real issues if devs work around it via `Object[ "keys" ](x)` or template literal injection.

### F-32 — `PREMISE_KIND_VOCABULARIES.legal` has 4 entries; `Premise.kind` union has 10
`/Users/zacharywolk/zwolk/argmap/src/schema/frame.ts:31-35`, `nodes.ts:201-211`

The vocabulary tables (4 + 4 + 4 = 12 entries, of which 9 unique because `stipulated` is shared) and the `PremiseKind` TS union (10 entries) are not derived from a single source. A future addition to `PremiseKind` (say, `"experimental"`) that isn't added to a vocabulary silently fails `V-ARG-3` on every frame. A `derived` type from the table would prevent drift.

### F-33 — `HookId` is a fixed enum `G1..G13`; no extensibility surface
`/Users/zacharywolk/zwolk/argmap/src/schema/identifiers.ts:8-21`

If a future hook is added (G14), every `HookInvocationRecord` of that hook fails the `HookId` type narrowing at import. Forward-compatibility hazard: a v1 client cannot import a v1.5 export with a new hook id. No migration handles this because no migration is defined yet.

### F-34 — Schema test gaps
`/Users/zacharywolk/zwolk/argmap/tests/schema/`

Aggregating what isn't tested:
- No test asserts `migrate()` handles malformed/missing `schema_version` (F-1).
- No test for `FrameVersion.mode/flavor/default_satisfaction_policies/jurisdiction_default` snapshot fields existing on round-trip (the legal fixture only sets `llm_settings_snapshot`, not the F-028 fields — see `legal-mode-fixture.ts:300-320`).
- No test that an envelope with `schema_version` of type string or `null` is rejected.
- No test that the `MIGRATION_REGISTRY` is in fact immutable.
- No test enumerating every `Node.type` × `Edge.type` combination against `VALID_EDGE_PAIRS` to prevent latent additions from being silently allowed.
- No test for the validator's interaction with the F-028 snapshot fields (V-ARG-3, V-FR-7 should prefer snapshot.mode over Conclusion inference — see F-3).
- `round-trip.test.ts` validates JSON ↔ JSON identity but does NOT validate that `migrate()` is idempotent — running `migrate(migrate(x))` should equal `migrate(x)`; currently untested.

### F-35 — `EXPECTED_IDS` in test is a hand-copy of the rule registry
`/Users/zacharywolk/zwolk/argmap/tests/schema/validation-rules.test.ts:80-120`

A second hardcoded enumeration of all 39 rule ids. Any new rule requires updating two lists in two files. The registry itself is the single source of truth (validation-rules.ts:1441-1481); the test should derive from it.

### F-36 — `EdgeType` switch in `type-narrowing.test.ts` lumps multiple cases together
`/Users/zacharywolk/zwolk/argmap/tests/schema/type-narrowing.test.ts:60-85`

```
case "DECOMPOSES_INTO":
case "TURNS_ON":
case "INTERPRETED_AS":
case "GATES":
case "BINDING_IN":
  return e.type;
```

The test exists to verify TS exhaustiveness, but lumping 5 distinct edge types into one body means a future regression that loses, say, `TurnsOnEdge.label` won't be caught. The test only proves the discriminator handles each case label, not that each branch's per-type fields are reachable.

### F-37 — `frameActions.options_box_edited` removes the `options_box` field but leaves `frame.default_satisfaction_policies` untouched on policy clear
`/Users/zacharywolk/zwolk/argmap/src/modes/frame-actions.ts:180-195`

When `patch.policy === null`, the per-instance `options_box` is deleted via object rest spread (line 189). But the resolver (`satisfaction-policy.ts:133-141`) then walks frame_default, then library default. There's no test for the edge case of repeatedly setting then clearing the policy — combined with F-4, a stale Authority/Premise entry in `frame.default_satisfaction_policies` would silently leak.

---

## Summary

**37 findings.** Distribution:
- Critical: 4 (silent acceptance of malformed envelopes; non-conformant UUID fallback; mode/flavor inference contradicting F-028; bogus key types on default_satisfaction_policies)
- High: 11 (cross-vocabulary leaks, missing option-id validation, mode/flavor toggle gaps, layer fields unenforced, position resolution unwired)
- Medium: 12 (mutability surfaces, snapshot-readonly gaps, type-only unions without runtime validation, slug surface unused & unsafe)
- Low: 10 (test coverage gaps, plugin coverage scope, hardcoded enumerations)

**Top themes**:
1. The F-028 snapshot fields (mode/flavor/default_satisfaction_policies/jurisdiction_default on FrameVersion) were added to remove inference, but V-ARG-3 and V-FR-7 still infer from Conclusions, directly contradicting F-028's stated purpose (F-3, F-12).
2. Mode and flavor changes don't scan Premise.kind, so toggles strand premises in cross-vocabulary states (F-6, F-7, F-8).
3. The schema declares TypeScript shapes but performs no runtime validation at import time; `migrate()` is the only entry point and it doesn't validate envelope shape (F-1, F-17, F-18).
4. Several layer/type/option-id relationships that the spec relies on are never enforced (F-9, F-10, F-5, F-28).
5. The FrameVersion is supposed to be immutable historical record but no `readonly` modifiers protect it (F-21).

File: `/Users/zacharywolk/.claude/jobs/d7b2d476/findings/15-schema-edges.md`
