import type { FrameId, FrameVersionId, HookId, NodeRef } from "./identifiers";
import type { Node } from "./nodes";
import type { Edge } from "./edges";
import type { SatisfactionPolicy, SatisfactionPolicyKey } from "./satisfaction-policy";

export type Mode = "legal" | "general";
export type Flavor = "personal" | "academic";

// Flattened mode+flavor discriminant for table lookup (matches PREMISE_KIND_VOCABULARIES keys).
export type ModeFlavor = "legal" | "general_academic" | "general_personal";

export function toModeFlavor(mode: Mode, flavor?: Flavor): ModeFlavor {
  if (mode === "legal") return "legal";
  return flavor === "academic" ? "general_academic" : "general_personal";
}

export interface Jurisdiction {
  level: "federal" | "state" | "tribal" | "territory" | "international";
  region?: string;
  court?: string;
  hierarchy_node_id?: string;
}

export interface Position {
  id: string;
  label: string;
  description?: string;
}

// V-ARG-3 consults this at validation time. Vocabulary depends on frame mode/flavor.
export const PREMISE_KIND_VOCABULARIES = {
  legal: ["stipulated", "found", "disputed", "procedural"],
  general_academic: ["empirical", "definitional", "normative", "stipulated"],
  general_personal: ["observation", "value", "assumption", "stipulated"],
} as const;

export type PremiseKindVocabularyKey = keyof typeof PREMISE_KIND_VOCABULARIES;

// F-001: G5 calibrated thresholds projection on FrameVersion.
export interface BurdenThresholdMap {
  preponderance: number;
  clear_and_convincing: number;
  beyond_reasonable_doubt: number;
  scintilla: number;
  substantial_evidence: number;
  source: "default" | "g5_calibrated";
  calibrated_from?: { standard_of_review: string; calibrated_at: string };
}

export interface HookInvocationRecord {
  id: string;
  hook_id: HookId;
  prompt_name: string;
  prompt_version: string;
  provider_id: string;
  model_id: string;
  input_hash: string;
  /** F-03 (audit §12): SHA-256 of the un-rendered prompt body, recorded so
   *  replay can prove the prompt was byte-identical even if the bundle or
   *  the archived prompt row drifts. Optional for backwards compatibility
   *  with records persisted before the field existed. */
  prompt_body_hash?: string;
  /** F-03 (audit §12): SHA-256 of the final rendered prompt string. */
  rendered_prompt_hash?: string;
  raw_response?: string;
  decision: "accepted" | "edited" | "rejected";
  final_value?: unknown;
  target_node_ids?: NodeRef[];
  target_field_paths?: string[];
  invoked_at: string;
  committed_at?: string;
}

export interface LlmSettings {
  build_time_hooks_enabled: boolean;
  runtime_hooks_enabled: boolean;
  output_time_hooks_enabled: boolean;
  prompt_versions?: { [hook_name: string]: string };
  per_hook_enabled?: { [hook_name: string]: boolean };
  calibrated_thresholds?: BurdenThresholdMap;
  invocations: HookInvocationRecord[];
  provider_id?: string;
}

export interface Frame {
  id: FrameId;
  slug?: string;
  title: string;
  description?: string;
  mode: Mode;
  flavor?: Flavor;
  jurisdiction_default?: Jurisdiction;
  positions?: Position[];
  default_satisfaction_policies: { [K in SatisfactionPolicyKey]?: SatisfactionPolicy };
  tags: string[];
  pinned: boolean;
  // F-004 #4 / F-008 #3: additive archived flag (default false at the app layer).
  archived?: boolean;
  created_at: string;
  updated_at: string;
  last_opened_at?: string;
  current_version_id: FrameVersionId;
  llm_settings?: LlmSettings;
}

export interface FrameVersion {
  id: FrameVersionId;
  frame_id: FrameId;
  version_number: number;
  parent_version_id?: FrameVersionId;
  created_at: string;
  created_by?: string;
  change_summary?: string;
  nodes: Node[];
  edges: Edge[];
  is_milestone: boolean;
  // F-001: G5 calibrated thresholds projection.
  llm_settings_snapshot?: {
    calibrated_thresholds?: BurdenThresholdMap;
  };
  // F-028: Frame-level compute-affecting fields snapshotted at version-mint
  // time so the runtime computes purely from FrameVersion + ArgumentSession
  // (Article II § 2). Without these, the runtime inferred or defaulted —
  // which silently ignored user edits to Frame.default_satisfaction_policies
  // and Frame.jurisdiction_default, and broke determinism when an older
  // FrameVersion was restored after Frame-level edits.
  default_satisfaction_policies?: { [K in SatisfactionPolicyKey]?: SatisfactionPolicy };
  jurisdiction_default?: Jurisdiction;
  mode?: Mode;
  flavor?: Flavor;
}
