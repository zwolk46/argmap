// Per-node satisfaction criteria — the "options box" framework (Article II § 3).
//
// Stream B canonical names are used: `all_of` parallels `any_of`. Contracts v2
// uses `conditions` for the AND group on the same field; the schema spec
// resolved this divergence in favor of Stream B's `all_of` (F-003 #1, then
// F-011 in this session's flag log when contracts v2's bump turned out to be
// partial). Twelve named conditions; AND-by-default with at most one explicit
// AnyOf group; no nesting, no NOT (negations are explicit conditions).

import type { BurdenLevel } from "./nodes";

export type { BurdenLevel };

export type Condition =
  // Structural
  | { kind: "premise_attached" }
  | { kind: "interpretation_selected" }
  | { kind: "all_children_resolved" }
  | { kind: "path_complete" }
  // Quality
  | { kind: "not_contradicted" }
  | { kind: "premise_kind_in"; kinds: string[] }
  | { kind: "burden_met"; level: BurdenLevel }
  // Authority (legal-only; offered as opt-in for academic flavor)
  | { kind: "authority_required" }
  | { kind: "authority_binding" }
  | { kind: "not_distinguished" }
  // Procedural
  | { kind: "standard_of_review_applied" }
  // Universal
  | { kind: "not_foreclosed" };

export interface SatisfactionPolicy {
  all_of: Condition[];
  any_of?: Condition[];
}

// Per-node-type defaults seeded at frame creation. Only Checkpoint, RootQuestion,
// SubQuestion, and Interpretation may carry per-instance overrides via
// Node.options_box; other types use the frame default unconditionally. Premise
// and Authority have no policy (they are inputs / sources).
export const DEFAULT_SATISFACTION_POLICIES: Readonly<{
  Checkpoint: SatisfactionPolicy;
  Interpretation: SatisfactionPolicy;
  Term: SatisfactionPolicy;
  SubQuestion: SatisfactionPolicy;
  RootQuestion: SatisfactionPolicy;
  Conclusion: SatisfactionPolicy;
  LogicalGate: SatisfactionPolicy;
}> = {
  Checkpoint: {
    all_of: [
      { kind: "premise_attached" },
      { kind: "not_contradicted" },
      { kind: "burden_met", level: "preponderance" },
      { kind: "not_foreclosed" },
    ],
  },
  Interpretation: {
    all_of: [{ kind: "interpretation_selected" }, { kind: "not_foreclosed" }],
  },
  Term: {
    all_of: [{ kind: "interpretation_selected" }, { kind: "not_foreclosed" }],
  },
  SubQuestion: {
    all_of: [{ kind: "all_children_resolved" }, { kind: "not_foreclosed" }],
  },
  RootQuestion: {
    all_of: [{ kind: "all_children_resolved" }, { kind: "not_foreclosed" }],
  },
  Conclusion: {
    all_of: [{ kind: "path_complete" }, { kind: "not_foreclosed" }],
  },
  LogicalGate: {
    all_of: [{ kind: "not_foreclosed" }],
  },
};

export type SatisfactionPolicyKey = keyof typeof DEFAULT_SATISFACTION_POLICIES;

export type ConditionKind = Condition["kind"];

// Canonical rendering order: structural → quality → authority → procedural → universal.
// ConditionList renders all_of entries in this order for git-diff stability (Article II § 2).
export const CONDITION_KIND_PRIORITY: readonly ConditionKind[] = [
  "premise_attached",
  "interpretation_selected",
  "all_children_resolved",
  "path_complete",
  "not_contradicted",
  "premise_kind_in",
  "burden_met",
  "authority_required",
  "authority_binding",
  "not_distinguished",
  "standard_of_review_applied",
  "not_foreclosed",
] as const;

// Conditions offered in the picker per mode/flavor per D4/D5.
// authority_* and standard_of_review_applied are legal-only;
// authority_* are also offered as opt-in for academic flavor.
// burden_met is legal-only.
export const OFFERED_CONDITIONS_BY_MODE_FLAVOR: Readonly<
  Record<"legal" | "general_academic" | "general_personal", readonly ConditionKind[]>
> = {
  legal: CONDITION_KIND_PRIORITY,
  general_academic: [
    "premise_attached",
    "interpretation_selected",
    "all_children_resolved",
    "path_complete",
    "not_contradicted",
    "premise_kind_in",
    "authority_required",
    "authority_binding",
    "not_distinguished",
    "not_foreclosed",
  ],
  general_personal: [
    "premise_attached",
    "interpretation_selected",
    "all_children_resolved",
    "path_complete",
    "not_contradicted",
    "premise_kind_in",
    "not_foreclosed",
  ],
};

// Per A3: the per-instance options_box replaces the frame-default policy
// entirely; merging is intentionally NOT supported.
export function resolveEffectivePolicy(
  node_type: SatisfactionPolicyKey,
  per_instance: SatisfactionPolicy | undefined,
  frame_default: SatisfactionPolicy | undefined,
): SatisfactionPolicy {
  if (per_instance) return per_instance;
  if (frame_default) return frame_default;
  return DEFAULT_SATISFACTION_POLICIES[node_type];
}
