import type {
  Frame,
  FrameVersion,
  Node,
  Edge,
  ArgumentSession,
  ArgumentSessionVersion,
  NodeRef,
  EdgeRef,
  SatisfactionPolicy,
  SatisfactionPolicyKey,
  Premise,
  Authority,
  Mode,
  Flavor,
  Position,
  ConclusionDirection,
  ValidationResult,
  NodeStatus,
} from "@/schema";
import { runValidation } from "@/schema";
import type { ComputeResult } from "@/runtime";
import type { ComputeDriver } from "./compute-driver";

// ---- Shared dispatch opts ----

export interface DispatchOpts {
  now: string;
  generateId: () => string;
}

// ---- Supporting types ----

export interface ConclusionDirectionResolution {
  node_id: NodeRef;
  direction: ConclusionDirection;
}

export type CheckpointAnswer = {
  selected_option_id: string;
  premise_id: NodeRef;
  notes?: string;
};

// ---- Frame patches (contracts v2 canonical names) ----

export type FramePatch =
  | { kind: "node_added"; node: Node }
  | { kind: "node_edited"; node_id: NodeRef; partial: Partial<Node> }
  | {
      kind: "node_removed";
      node_id: NodeRef;
      cascade?: { node_ids?: NodeRef[]; edge_ids?: EdgeRef[] };
    }
  | { kind: "edge_added"; edge: Edge }
  | { kind: "edge_edited"; edge_id: EdgeRef; partial: Partial<Edge> }
  | { kind: "edge_removed"; edge_id: EdgeRef }
  | { kind: "options_box_edited"; node_id: NodeRef; policy: SatisfactionPolicy | null }
  | {
      kind: "metadata_edited";
      partial: Partial<
        Pick<
          Frame,
          | "title"
          | "description"
          | "tags"
          | "jurisdiction_default"
          | "positions"
          | "flavor"
          | "archived"
        >
      >;
    }
  | { kind: "presentation_hints_reset_all" }
  | { kind: "default_policy_edited"; node_type: SatisfactionPolicyKey; policy: SatisfactionPolicy }
  | {
      kind: "architectural_mode_changed";
      target_mode: Mode;
      target_flavor?: Flavor;
      positions_added?: Position[];
      conclusion_direction_resolutions: ConclusionDirectionResolution[];
      change_summary: string;
    };

// ---- Session patches (contracts v2 canonical names) ----

export type SessionPatch =
  | { kind: "checkpoint_answered"; node_id: NodeRef; answer: CheckpointAnswer }
  | { kind: "interpretation_selected"; term_id: NodeRef; interpretation_id: NodeRef | null }
  | { kind: "premise_added"; premise: Premise }
  | { kind: "premise_edited"; premise_id: string; partial: Partial<Premise> }
  | { kind: "premise_removed"; premise_id: string }
  | { kind: "argument_edge_added"; edge: Edge }
  | { kind: "argument_edge_removed"; edge_id: EdgeRef }
  | { kind: "session_authority_added"; authority: Authority }
  | { kind: "session_authority_edited"; authority_id: string; partial: Partial<Authority> }
  | { kind: "session_authority_removed"; authority_id: string }
  | {
      kind: "session_metadata_edited";
      partial: Partial<Pick<ArgumentSession, "title" | "description" | "archived">>;
    }
  | { kind: "output_overrides_cleared" };

// ---- Dispatch table return types ----

export interface FrameTransformResult {
  next_version: FrameVersion;
  frame_partial?: Partial<
    Pick<
      Frame,
      | "title"
      | "description"
      | "tags"
      | "jurisdiction_default"
      | "positions"
      | "flavor"
      | "mode"
      | "archived"
      | "default_satisfaction_policies"
    >
  >;
  change_summary?: string;
}

export interface SessionTransformResult {
  next_session_raw: ArgumentSession;
  next_version_raw: ArgumentSessionVersion;
}

// ---- Dispatch tables (implemented by I.6 modes) ----

export interface FrameActionDispatchTable {
  node_added: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_added" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  node_edited: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_edited" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  node_removed: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_removed" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  edge_added: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_added" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  edge_edited: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_edited" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  edge_removed: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_removed" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  options_box_edited: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "options_box_edited" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  metadata_edited: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "metadata_edited" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  presentation_hints_reset_all: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "presentation_hints_reset_all" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  default_policy_edited: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "default_policy_edited" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  architectural_mode_changed: (
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "architectural_mode_changed" }>,
    opts: DispatchOpts,
  ) => FrameTransformResult;
}

export interface SessionActionDispatchTable {
  checkpoint_answered: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "checkpoint_answered" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  interpretation_selected: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "interpretation_selected" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  premise_added: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_added" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  premise_edited: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_edited" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  premise_removed: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_removed" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  argument_edge_added: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "argument_edge_added" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  argument_edge_removed: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "argument_edge_removed" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  session_authority_added: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_added" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  session_authority_edited: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_edited" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  session_authority_removed: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_removed" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  session_metadata_edited: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_metadata_edited" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  output_overrides_cleared: (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "output_overrides_cleared" }>,
    opts: DispatchOpts,
  ) => SessionTransformResult;
}

// ---- Orchestrator input/result types ----

export interface RunFrameActionInput {
  frame: Frame;
  current_version: FrameVersion;
  patch: FramePatch;
  now: string;
  generateId: () => string;
  dispatch: FrameActionDispatchTable;
  compute_driver?: ComputeDriver;
  active_sessions?: Array<{ session: ArgumentSession; version: ArgumentSessionVersion }>;
}

export interface FrameActionResult {
  next_frame: Frame;
  next_version: FrameVersion;
  recomputed: Map<string, ComputeResult>;
  validation: ReadonlyArray<ValidationResult>;
  change_summary?: string;
}

export interface RunSessionActionInput {
  session: ArgumentSession;
  current_version: ArgumentSessionVersion;
  patch: SessionPatch;
  now: string;
  generateId: () => string;
  dispatch: SessionActionDispatchTable;
  compute_driver: ComputeDriver;
}

export interface SessionActionResult {
  next_session: ArgumentSession;
  next_version: ArgumentSessionVersion;
  compute_result: ComputeResult;
}

// ---- Orchestrators ----

export function runFrameAction(input: RunFrameActionInput): FrameActionResult {
  const {
    frame,
    current_version,
    patch,
    now,
    generateId,
    dispatch,
    compute_driver,
    active_sessions,
  } = input;
  const opts: DispatchOpts = { now, generateId };

  const handler = dispatch[patch.kind] as unknown as (
    frame: Frame,
    fv: FrameVersion,
    patch: FramePatch,
    opts: DispatchOpts,
  ) => FrameTransformResult;
  const transform = handler(frame, current_version, patch, opts);

  const new_version_id = generateId();

  // Compute next_frame BEFORE next_version so the new version can snapshot the
  // (possibly-just-updated) Frame-level compute-affecting fields. F-028.
  const next_frame: Frame = {
    ...frame,
    ...(transform.frame_partial ?? {}),
    current_version_id: new_version_id,
    updated_at: now,
  };

  const next_version: FrameVersion = {
    ...transform.next_version,
    id: new_version_id,
    frame_id: frame.id,
    version_number: current_version.version_number + 1,
    parent_version_id: current_version.id,
    created_at: now,
    is_milestone: false,
    change_summary: transform.change_summary,
    // F-028: snapshot Frame-level compute-affecting fields so the runtime
    // computes purely from FrameVersion + ArgumentSession.
    default_satisfaction_policies: next_frame.default_satisfaction_policies,
    jurisdiction_default: next_frame.jurisdiction_default,
    mode: next_frame.mode,
    flavor: next_frame.flavor,
  };

  const validation = runValidation(next_version);

  const recomputed = new Map<string, ComputeResult>();
  if (compute_driver && active_sessions) {
    for (const { session } of active_sessions) {
      const patched: ArgumentSession = { ...session, frame_version_snapshot: next_version };
      recomputed.set(session.id, compute_driver.runFor(patched, now));
    }
  }

  return {
    next_frame,
    next_version,
    recomputed,
    validation,
    change_summary: transform.change_summary,
  };
}

export function runSessionAction(input: RunSessionActionInput): SessionActionResult {
  const { session, current_version, patch, now, generateId, dispatch, compute_driver } = input;
  const opts: DispatchOpts = { now, generateId };

  const handler = dispatch[patch.kind] as unknown as (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: SessionPatch,
    opts: DispatchOpts,
  ) => SessionTransformResult;
  const transform = handler(session, current_version, patch, opts);

  const new_version_id = generateId();
  const next_version: ArgumentSessionVersion = {
    ...transform.next_version_raw,
    id: new_version_id,
    session_id: session.id,
    version_number: current_version.version_number + 1,
    parent_version_id: current_version.id,
    created_at: now,
    is_milestone: false,
  };

  const compute_result = compute_driver.runFor(transform.next_session_raw, now);

  const status_map: { [node_id: string]: NodeStatus } = {};
  compute_result.status_map.forEach((v, k) => {
    status_map[k] = v;
  });

  const next_session: ArgumentSession = {
    ...transform.next_session_raw,
    current_version_id: new_version_id,
    updated_at: now,
    status_map,
    output: compute_result.output,
    active_path: [...compute_result.active_path],
  };

  return { next_session, next_version, compute_result };
}

export function validateOnly(
  frame_version: FrameVersion,
  _compute_driver?: ComputeDriver,
): ReadonlyArray<ValidationResult> {
  return runValidation(frame_version);
}
