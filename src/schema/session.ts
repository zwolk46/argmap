import type {
  NodeRef,
  FrameId,
  FrameVersionId,
  SessionId,
  SessionVersionId,
  HookId,
} from "./identifiers";
import type { FrameVersion } from "./frame";
import type { Authority, Premise } from "./nodes";
import type { Edge } from "./edges";

// F-003 #3: NodeStatus is canonically located here (schema), not @/runtime —
// ArgumentSession.status_map persists this shape.
export interface NodeStatus {
  status: "open" | "satisfied" | "contested" | "foreclosed" | "not_applicable";
  via?: Array<
    | "binding_authority"
    | "persuasive_authority"
    | "stipulation"
    | "structural_resolution"
    | "default"
  >;
  evaluated_at: string;
  failed_conditions?: string[];
}

export interface CheckpointResponse {
  checkpoint_id: NodeRef;
  selected_option_id: string;
  premise_id: NodeRef;
  answered_at: string;
  notes?: string;
}

// Stream C amendment to B4. V-ARG-6/7/8 govern.
export interface InterpretationSelection {
  term_id: NodeRef;
  selected_interpretation_ids: NodeRef[];
  supporting_premise_id?: NodeRef;
  supporting_authority_id?: NodeRef;
  notes?: string;
  selected_at: string;
}

export interface BranchCondition {
  gate_node_id: NodeRef;
  required_value: string;
  required_value_label: string;
}

export interface ConditionalBranch {
  id: string;
  conditions: BranchCondition[];
  resulting_conclusion: NodeRef;
  intermediate_path: NodeRef[];
  prose: string;
}

// F-003 #4: OpenGate is canonically located here, not @/runtime.
export interface OpenGate {
  node_id: NodeRef;
  reason:
    | "no_premise"
    | "premise_contradicted"
    | "burden_unmet"
    | "authority_missing"
    | "structural";
  prompt: string;
}

export interface ConfidenceBreakdown {
  total_checkpoints_on_path: number;
  satisfied_via_binding: number;
  satisfied_via_persuasive: number;
  satisfied_via_stipulation: number;
  satisfied_via_structural: number;
  contested: number;
  open: number;
}

export interface ConditionalOutput {
  shape: "determinate" | "conditional" | "contested" | "incomplete";
  conclusion?: NodeRef;
  primary_path?: NodeRef[];
  branches?: ConditionalBranch[];
  contested_nodes?: NodeRef[];
  best_inference?: NodeRef;
  open_gates?: OpenGate[];
  prose_summary: string;
  computed_at: string;
  confidence_breakdown: ConfidenceBreakdown;
}

export interface ArgumentSession {
  id: SessionId;
  slug?: string;
  frame_id: FrameId;
  frame_version_id: FrameVersionId;
  frame_version_snapshot: FrameVersion;
  title: string;
  description?: string;

  premises: Premise[];
  argument_edges: Edge[];
  session_authorities?: Authority[];

  checkpoint_responses: CheckpointResponse[];
  interpretation_selections: InterpretationSelection[];

  status_map: { [node_id: string]: NodeStatus };
  output?: ConditionalOutput;
  active_path?: NodeRef[];

  frame_version_drift_warning?: string;

  // F-008 #3: additive archived flag (default false at the app layer).
  archived?: boolean;

  created_at: string;
  updated_at: string;
  current_version_id: SessionVersionId;
}

export interface ArgumentSessionVersion {
  id: SessionVersionId;
  session_id: SessionId;
  version_number: number;
  parent_version_id?: SessionVersionId;
  created_at: string;
  created_by?: string;
  change_summary?: string;
  premises: Premise[];
  argument_edges: Edge[];
  session_authorities?: Authority[];
  checkpoint_responses: CheckpointResponse[];
  interpretation_selections: InterpretationSelection[];
  is_milestone: boolean;

  // §8 #1: snapshot of the FrameVersion this session-version was authored
  // against. Optional in the type for backwards-compatibility with persisted
  // rows written before this field existed; new writes always populate it
  // (action-runner, migrateSession, restoreSessionVersion, initial save, and
  // saveSessionVersion's repository-side backfill all set it). The
  // version-history preview reads this to render the historical frame, not
  // the live frame — without it the preview shows old premises against
  // today's frame after a migration, which both misrepresents history and
  // breaks Article II §2 (Determinism) for replay of the same version_id.
  frame_version_snapshot?: FrameVersion;

  // F-002: G6 prose-rewrite carrier. Canonical ConditionalOutput.prose_summary unchanged.
  output_overrides?: {
    rewritten_prose?: string;
    rewritten_at?: string;
    rewritten_by_hook?: HookId;
  };
}
