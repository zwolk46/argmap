// A representative legal-mode FrameExport + ArgumentSessionExport used by
// round-trip.test.ts. Constructed deterministically; no clock reads. Every
// node type and every frame-layer-instantiated edge type is present.

import {
  CURRENT_APP_VERSION,
  CURRENT_SCHEMA_VERSION,
  type ArgumentSession,
  type ArgumentSessionExport,
  type ArgumentSessionVersion,
  type Authority,
  type Checkpoint,
  type Conclusion,
  type Edge,
  type Frame,
  type FrameExport,
  type FrameVersion,
  type IfThenGate,
  type Interpretation,
  type Node,
  type Premise,
  type RootQuestion,
  type SubQuestion,
  type Term,
} from "@/schema";

const T = "2026-05-01T12:00:00.000Z";

function n<T extends Node>(node: T): T {
  return node;
}

function e<T extends Edge>(edge: T): T {
  return edge;
}

export function buildLegalModeFixture(): {
  frame_export: FrameExport;
  session_export: ArgumentSessionExport;
} {
  const root = n<RootQuestion>({
    id: "node-root",
    type: "RootQuestion",
    layer: "frame",
    statement: "Is the defendant liable for negligence?",
    standard_of_review: "de_novo",
    created_at: T,
    updated_at: T,
  });

  const subDuty = n<SubQuestion>({
    id: "node-sub-duty",
    type: "SubQuestion",
    layer: "frame",
    statement: "Did the defendant owe a duty of care?",
    is_jurisdictional: false,
    created_at: T,
    updated_at: T,
  });

  const subJur = n<SubQuestion>({
    id: "node-sub-jur",
    type: "SubQuestion",
    layer: "frame",
    statement: "Does the court have personal jurisdiction?",
    is_jurisdictional: true,
    created_at: T,
    updated_at: T,
  });

  const term = n<Term>({
    id: "node-term-foreseeability",
    type: "Term",
    layer: "frame",
    name: "foreseeability",
    order: 0,
    dispositive: true,
    created_at: T,
    updated_at: T,
  });

  const interpA = n<Interpretation>({
    id: "node-interp-broad",
    type: "Interpretation",
    layer: "frame",
    statement: "Broad foreseeability (Cardozo).",
    notes: "Traditional view.",
    created_at: T,
    updated_at: T,
  });

  const interpB = n<Interpretation>({
    id: "node-interp-narrow",
    type: "Interpretation",
    layer: "frame",
    statement: "Narrow foreseeability (Andrews).",
    notes: "Restrictive view.",
    created_at: T,
    updated_at: T,
  });

  const cp = n<Checkpoint>({
    id: "node-cp-breach",
    type: "Checkpoint",
    layer: "frame",
    question: "Did the defendant breach the duty of care?",
    answer_type: "boolean",
    options: [
      { id: "opt-yes", label: "yes", satisfies: true, target_node_id: "node-conclusion" },
      { id: "opt-no", label: "no", satisfies: false },
    ],
    requires_premise: true,
    requires_authority: true,
    burden_level: "preponderance",
    created_at: T,
    updated_at: T,
  });

  const gate = n<IfThenGate>({
    id: "node-gate-1",
    type: "LogicalGate",
    layer: "frame",
    gate_type: "IF_THEN",
    antecedent: interpA.id,
    consequent: cp.id,
    created_at: T,
    updated_at: T,
  });

  const conclusion = n<Conclusion>({
    id: "node-conclusion",
    type: "Conclusion",
    layer: "frame",
    statement: "Defendant is liable.",
    direction: { kind: "legal", value: "favors_plaintiff" },
    reasoning_summary: "Breach plus foreseeable harm yields liability.",
    created_at: T,
    updated_at: T,
  });

  const authority = n<Authority>({
    id: "node-auth-palsgraf",
    type: "Authority",
    layer: "frame",
    citation: "Palsgraf v. Long Island R.R., 248 N.Y. 339 (1928)",
    court: "N.Y. Court of Appeals",
    year: 1928,
    holding_summary: "Foreseeability defines duty.",
    is_holding: true,
    is_binding: true,
    jurisdiction: { level: "state", region: "New York" },
    binding_in: [{ level: "state", region: "New York" }],
    short_label: "Palsgraf",
    created_at: T,
    updated_at: T,
  });

  // Frame-layer edges
  const edges: Edge[] = [
    e({
      id: "edge-1",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: root.id,
      target: subDuty.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-1b",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: root.id,
      target: subJur.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-2",
      type: "TURNS_ON",
      layer: "frame",
      source: subDuty.id,
      target: term.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-3a",
      type: "INTERPRETED_AS",
      layer: "frame",
      source: term.id,
      target: interpA.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-3b",
      type: "INTERPRETED_AS",
      layer: "frame",
      source: term.id,
      target: interpB.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-4",
      type: "LEADS_TO",
      layer: "frame",
      source: interpA.id,
      target: cp.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-4b",
      type: "LEADS_TO",
      layer: "frame",
      source: interpB.id,
      target: cp.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-5",
      type: "LEADS_TO",
      layer: "frame",
      source: gate.id,
      target: conclusion.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-5b",
      type: "LEADS_TO",
      layer: "frame",
      source: interpA.id,
      target: gate.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-6",
      type: "FORECLOSES",
      layer: "frame",
      source: interpB.id,
      target: cp.id,
      scope: "moot",
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-7",
      type: "GATES",
      layer: "frame",
      source: gate.id,
      target: conclusion.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-8",
      type: "CITES",
      layer: "frame",
      source: authority.id,
      target: interpA.id,
      strength: "directly_on_point",
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-9",
      type: "DISTINGUISHED_BY",
      layer: "frame",
      source: authority.id,
      target: interpB.id,
      reasoning: "Facts diverge in material respects.",
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-10",
      type: "LEADS_TO",
      layer: "frame",
      source: interpA.id,
      target: conclusion.id,
      created_at: T,
      updated_at: T,
    }),
    e({
      id: "edge-11",
      type: "LEADS_TO",
      layer: "frame",
      source: interpB.id,
      target: conclusion.id,
      created_at: T,
      updated_at: T,
    }),
  ];

  const frameVersion: FrameVersion = {
    id: "fv-1",
    frame_id: "frame-1",
    version_number: 1,
    is_milestone: true,
    nodes: [root, subDuty, subJur, term, interpA, interpB, cp, gate, conclusion, authority],
    edges,
    created_at: T,
    change_summary: "initial",
    llm_settings_snapshot: {
      calibrated_thresholds: {
        preponderance: 0.51,
        clear_and_convincing: 0.75,
        beyond_reasonable_doubt: 0.95,
        scintilla: 0.1,
        substantial_evidence: 0.5,
        source: "g5_calibrated",
        calibrated_from: { standard_of_review: "de_novo", calibrated_at: T },
      },
    },
  };

  const frame: Frame = {
    id: "frame-1",
    title: "Negligence claim",
    description: "Demonstration legal-mode frame.",
    mode: "legal",
    jurisdiction_default: { level: "state", region: "New York" },
    default_satisfaction_policies: {},
    tags: ["torts", "demo"],
    pinned: false,
    created_at: T,
    updated_at: T,
    current_version_id: "fv-1",
  };

  const premise: Premise = {
    id: "node-premise-1",
    type: "Premise",
    layer: "argument",
    statement: "Defendant was driving 50mph in a 25mph zone.",
    kind: "found",
    source: "stipulation",
    authority_ref: authority.id,
    created_at: T,
    updated_at: T,
  };

  const session: ArgumentSession = {
    id: "sess-1",
    frame_id: "frame-1",
    frame_version_id: "fv-1",
    frame_version_snapshot: frameVersion,
    title: "Trial brief 2026-05-01",
    premises: [premise],
    argument_edges: [
      e({
        id: "arg-edge-1",
        type: "ANSWERS",
        layer: "argument",
        source: premise.id,
        target: cp.id,
        selected_option_id: "opt-yes",
        created_at: T,
        updated_at: T,
      }),
    ],
    session_authorities: [],
    checkpoint_responses: [
      {
        checkpoint_id: cp.id,
        selected_option_id: "opt-yes",
        premise_id: premise.id,
        answered_at: T,
      },
    ],
    interpretation_selections: [
      {
        term_id: term.id,
        selected_interpretation_ids: [interpA.id],
        supporting_premise_id: premise.id,
        supporting_authority_id: authority.id,
        selected_at: T,
      },
    ],
    status_map: {},
    created_at: T,
    updated_at: T,
    current_version_id: "sv-1",
  };

  const sessionVersion: ArgumentSessionVersion = {
    id: "sv-1",
    session_id: "sess-1",
    version_number: 1,
    is_milestone: true,
    created_at: T,
    premises: [premise],
    argument_edges: session.argument_edges,
    session_authorities: [],
    checkpoint_responses: session.checkpoint_responses,
    interpretation_selections: session.interpretation_selections,
    change_summary: "initial",
  };

  const frame_export: FrameExport = {
    schema_version: CURRENT_SCHEMA_VERSION,
    app_version: CURRENT_APP_VERSION,
    exported_at: T,
    frame,
    current_version: frameVersion,
  };

  const session_export: ArgumentSessionExport = {
    schema_version: CURRENT_SCHEMA_VERSION,
    app_version: CURRENT_APP_VERSION,
    exported_at: T,
    session,
    current_version: sessionVersion,
    embedded_frame_export: frame_export,
  };

  return { frame_export, session_export };
}
