import type { Frame, FrameVersion, ArgumentSession, ArgumentSessionVersion } from "@/schema";

const T = "2026-05-10T00:00:00.000Z";

export function buildSeededDbState(): {
  frames: Frame[];
  frame_versions: FrameVersion[];
  argument_sessions: ArgumentSession[];
  argument_session_versions: ArgumentSessionVersion[];
} {
  const frame: Frame = {
    id: "seeded-frame-1",
    title: "Seeded Frame",
    mode: "general",
    default_satisfaction_policies: {},
    tags: ["seeded"],
    pinned: false,
    created_at: T,
    updated_at: T,
    current_version_id: "seeded-fv-1",
  };
  const frame_version: FrameVersion = {
    id: "seeded-fv-1",
    frame_id: "seeded-frame-1",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    nodes: [],
    edges: [],
  };
  const session: ArgumentSession = {
    id: "seeded-sess-1",
    frame_id: "seeded-frame-1",
    frame_version_id: "seeded-fv-1",
    frame_version_snapshot: frame_version,
    title: "Seeded Session",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: T,
    updated_at: T,
    current_version_id: "seeded-sv-1",
  };
  const session_version: ArgumentSessionVersion = {
    id: "seeded-sv-1",
    session_id: "seeded-sess-1",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
  };
  return {
    frames: [frame],
    frame_versions: [frame_version],
    argument_sessions: [session],
    argument_session_versions: [session_version],
  };
}

export function buildFrameWithEveryNodeAndEveryEdgeType(): {
  frame: Frame;
  current_version: FrameVersion;
} {
  const frame: Frame = {
    id: "every-node-frame",
    title: "Every Node Frame",
    mode: "general",
    default_satisfaction_policies: {},
    tags: [],
    pinned: false,
    created_at: T,
    updated_at: T,
    current_version_id: "every-node-fv-1",
  };
  const frame_version: FrameVersion = {
    id: "every-node-fv-1",
    frame_id: "every-node-frame",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    nodes: [
      {
        id: "n-root",
        type: "RootQuestion",
        layer: "frame",
        statement: "Root?",
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-sub",
        type: "SubQuestion",
        layer: "frame",
        statement: "Sub?",
        is_jurisdictional: false,
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-term",
        type: "Term",
        layer: "frame",
        name: "TestTerm",
        order: 0,
        dispositive: false,
        linked_to: "n-interp",
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-interp",
        type: "Interpretation",
        layer: "frame",
        statement: "Interp.",
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-cp",
        type: "Checkpoint",
        layer: "frame",
        question: "Cp?",
        answer_type: "boolean",
        options: [
          { id: "opt-y", label: "yes", satisfies: true, target_node_id: "n-conc" },
          { id: "opt-n", label: "no", satisfies: false },
        ],
        requires_premise: false,
        requires_authority: false,
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-gate",
        type: "LogicalGate",
        layer: "frame",
        gate_type: "AND",
        inputs: ["n-sub", "n-interp"],
        output_target: "n-conc",
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-conc",
        type: "Conclusion",
        layer: "frame",
        statement: "Concluded.",
        direction: { kind: "general", position_id: "pos-1" },
        created_at: T,
        updated_at: T,
      },
      {
        id: "n-auth",
        type: "Authority",
        layer: "frame",
        citation: "Test v. Test, 2026",
        created_at: T,
        updated_at: T,
      },
    ] as FrameVersion["nodes"],
    edges: [
      {
        id: "e-1",
        type: "DECOMPOSES_INTO",
        layer: "frame",
        source: "n-root",
        target: "n-sub",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-2",
        type: "TURNS_ON",
        layer: "frame",
        source: "n-sub",
        target: "n-term",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-3",
        type: "INTERPRETED_AS",
        layer: "frame",
        source: "n-term",
        target: "n-interp",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-4",
        type: "LEADS_TO",
        layer: "frame",
        source: "n-interp",
        target: "n-cp",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-5",
        type: "LEADS_TO",
        layer: "frame",
        source: "n-cp",
        target: "n-conc",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-6",
        type: "FORECLOSES",
        layer: "frame",
        source: "n-interp",
        target: "n-cp",
        scope: "moot",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-7",
        type: "CITES",
        layer: "frame",
        source: "n-auth",
        target: "n-interp",
        strength: "directly_on_point",
        created_at: T,
        updated_at: T,
      },
    ] as FrameVersion["edges"],
  };
  return { frame, current_version: frame_version };
}

export function buildSessionWithDriftedFrameVersion(): {
  frame: Frame;
  old_version: FrameVersion;
  new_version: FrameVersion;
  session: ArgumentSession;
  session_version: ArgumentSessionVersion;
} {
  const frame: Frame = {
    id: "drift-frame",
    title: "Drift Frame",
    mode: "general",
    default_satisfaction_policies: {},
    tags: [],
    pinned: false,
    created_at: T,
    updated_at: T,
    current_version_id: "drift-fv-2",
  };
  const old_version: FrameVersion = {
    id: "drift-fv-1",
    frame_id: "drift-frame",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    nodes: [],
    edges: [],
  };
  const new_version: FrameVersion = {
    id: "drift-fv-2",
    frame_id: "drift-frame",
    version_number: 2,
    parent_version_id: "drift-fv-1",
    is_milestone: false,
    created_at: T,
    nodes: [],
    edges: [],
  };
  const session: ArgumentSession = {
    id: "drift-sess-1",
    frame_id: "drift-frame",
    frame_version_id: "drift-fv-1", // Still pointing at old version
    frame_version_snapshot: old_version,
    title: "Session on old version",
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    status_map: {},
    created_at: T,
    updated_at: T,
    current_version_id: "drift-sv-1",
  };
  const session_version: ArgumentSessionVersion = {
    id: "drift-sv-1",
    session_id: "drift-sess-1",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
  };
  return { frame, old_version, new_version, session, session_version };
}
