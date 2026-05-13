import "fake-indexeddb/auto";
import type {
  Frame,
  FrameVersion,
  ArgumentSession,
  ArgumentSessionVersion,
  NodeRef,
} from "@/schema";
import type {
  FrameActionDispatchTable,
  SessionActionDispatchTable,
  FrameTransformResult,
  SessionTransformResult,
  DispatchOpts,
} from "@/state";

export { flushPromises, injectedNow, injectedGenerateId, freshDb } from "../persistence/_setup";

// ---- Minimal stub frame/session data ----

export function makeFrameVersion(overrides: Partial<FrameVersion> = {}): FrameVersion {
  return {
    id: "fv-1",
    frame_id: "fr-1",
    version_number: 1,
    created_at: "2026-05-10T00:00:00.000Z",
    is_milestone: true,
    nodes: [],
    edges: [],
    ...overrides,
  };
}

export function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "fr-1",
    title: "Test Frame",
    mode: "general",
    default_satisfaction_policies: {},
    tags: [],
    pinned: false,
    created_at: "2026-05-10T00:00:00.000Z",
    updated_at: "2026-05-10T00:00:00.000Z",
    current_version_id: "fv-1",
    ...overrides,
  };
}

export function makeSession(overrides: Partial<ArgumentSession> = {}): ArgumentSession {
  const fv = makeFrameVersion();
  return {
    id: "s-1",
    frame_id: "fr-1",
    frame_version_id: "fv-1",
    frame_version_snapshot: fv,
    title: "Test Session",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: "2026-05-10T00:00:00.000Z",
    updated_at: "2026-05-10T00:00:00.000Z",
    current_version_id: "sv-1",
    ...overrides,
  };
}

export function makeSessionVersion(
  overrides: Partial<ArgumentSessionVersion> = {},
): ArgumentSessionVersion {
  return {
    id: "sv-1",
    session_id: "s-1",
    version_number: 1,
    created_at: "2026-05-10T00:00:00.000Z",
    is_milestone: true,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    ...overrides,
  };
}

// ---- Stub dispatch tables ----

export function makeFrameDispatch(
  overrides: Partial<FrameActionDispatchTable> = {},
): FrameActionDispatchTable {
  const identity = (
    _frame: Frame,
    fv: FrameVersion,
    _patch: unknown,
    _opts: DispatchOpts,
  ): FrameTransformResult => ({ next_version: fv });

  return {
    node_added: identity as FrameActionDispatchTable["node_added"],
    node_edited: identity as FrameActionDispatchTable["node_edited"],
    node_removed: identity as FrameActionDispatchTable["node_removed"],
    edge_added: identity as FrameActionDispatchTable["edge_added"],
    edge_edited: identity as FrameActionDispatchTable["edge_edited"],
    edge_removed: identity as FrameActionDispatchTable["edge_removed"],
    options_box_edited: identity as FrameActionDispatchTable["options_box_edited"],
    metadata_edited: (_frame, fv, patch, _opts): FrameTransformResult => ({
      next_version: fv,
      frame_partial: patch.partial,
    }),
    presentation_hints_reset_all:
      identity as FrameActionDispatchTable["presentation_hints_reset_all"],
    default_policy_edited: identity as FrameActionDispatchTable["default_policy_edited"],
    architectural_mode_changed: identity as FrameActionDispatchTable["architectural_mode_changed"],
    ...overrides,
  };
}

export function makeSessionDispatch(
  overrides: Partial<SessionActionDispatchTable> = {},
): SessionActionDispatchTable {
  const identity = (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    _patch: unknown,
    _opts: DispatchOpts,
  ): SessionTransformResult => ({
    next_session_raw: s,
    next_version_raw: v,
  });

  const withPremiseAdded = (
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<import("@/state").SessionPatch, { kind: "premise_added" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult => ({
    next_session_raw: { ...s, premises: [...s.premises, patch.premise] },
    next_version_raw: { ...v, premises: [...v.premises, patch.premise] },
  });

  return {
    checkpoint_answered: identity as SessionActionDispatchTable["checkpoint_answered"],
    interpretation_selected: identity as SessionActionDispatchTable["interpretation_selected"],
    premise_added: withPremiseAdded,
    premise_edited: identity as SessionActionDispatchTable["premise_edited"],
    premise_removed: identity as SessionActionDispatchTable["premise_removed"],
    argument_edge_added: identity as SessionActionDispatchTable["argument_edge_added"],
    argument_edge_removed: identity as SessionActionDispatchTable["argument_edge_removed"],
    session_authority_added: identity as SessionActionDispatchTable["session_authority_added"],
    session_authority_edited: identity as SessionActionDispatchTable["session_authority_edited"],
    session_authority_removed: identity as SessionActionDispatchTable["session_authority_removed"],
    session_metadata_edited: (
      s: ArgumentSession,
      v: ArgumentSessionVersion,
      patch: Extract<import("@/state").SessionPatch, { kind: "session_metadata_edited" }>,
      _opts: DispatchOpts,
    ): SessionTransformResult => ({
      next_session_raw: {
        ...s,
        title: patch.partial.title ?? s.title,
        description: patch.partial.description ?? s.description,
      },
      next_version_raw: v,
    }),
    output_overrides_cleared: identity as SessionActionDispatchTable["output_overrides_cleared"],
    ...overrides,
  };
}

export function makeNode(id: NodeRef): import("@/schema").Node {
  return {
    id,
    type: "RootQuestion" as const,
    layer: "frame" as const,
    statement: `Question ${id}`,
    created_at: "2026-05-10T00:00:00.000Z",
    updated_at: "2026-05-10T00:00:00.000Z",
  };
}
