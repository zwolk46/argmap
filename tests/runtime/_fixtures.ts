// Fixture builders shared across runtime tests. Pure constructors; no
// clock reads (timestamps are pinned). Each builder produces a frame that
// passes the V-FR-1..12 / V-EDGE-1..4 schema validation rules so that the
// runtime can run its full pipeline against the fixture.

import type {
  Frame,
  FrameVersion,
  ArgumentSession,
  ArgumentSessionVersion,
  Node,
  Edge,
  Premise,
  Authority,
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  Conclusion,
  AndGate,
  OrGate,
  NotGate,
  IfThenGate,
  UnlessGate,
} from "@/schema";

export const T0 = "2026-05-10T00:00:00.000Z";

function nodeBase(id: string) {
  return { id, created_at: T0, updated_at: T0 };
}

export function root(id: string, statement: string, standard_of_review?: string): RootQuestion {
  const r: RootQuestion = {
    ...nodeBase(id),
    type: "RootQuestion",
    layer: "frame",
    statement,
  };
  if (standard_of_review) r.standard_of_review = standard_of_review;
  return r;
}

export function subQ(id: string, statement: string, is_jurisdictional = false): SubQuestion {
  return {
    ...nodeBase(id),
    type: "SubQuestion",
    layer: "frame",
    statement,
    is_jurisdictional,
  };
}

export function term(
  id: string,
  name: string,
  order = 0,
  dispositive = false,
  linked_to?: string,
): Term {
  const t: Term = {
    ...nodeBase(id),
    type: "Term",
    layer: "frame",
    name,
    order,
    dispositive,
  };
  if (linked_to) t.linked_to = linked_to;
  return t;
}

export function interp(id: string, statement: string, notes?: string): Interpretation {
  return {
    ...nodeBase(id),
    type: "Interpretation",
    layer: "frame",
    statement,
    ...(notes ? { notes } : {}),
  };
}

export function checkpoint(
  id: string,
  question: string,
  options: Array<{
    id: string;
    label: string;
    target?: string;
    satisfies?: boolean;
    routes_to?: "contested";
  }>,
  extra?: {
    answer_type?: "boolean" | "multiple_choice" | "graded";
    requires_premise?: boolean;
    requires_authority?: boolean;
    burden_level?: Checkpoint["burden_level"];
  },
): Checkpoint {
  return {
    ...nodeBase(id),
    type: "Checkpoint",
    layer: "frame",
    question,
    answer_type: extra?.answer_type ?? "multiple_choice",
    options: options.map((o) => {
      const opt: Checkpoint["options"][number] = {
        id: o.id,
        label: o.label,
        satisfies: o.satisfies ?? false,
      };
      if (o.target) opt.target_node_id = o.target;
      if (o.routes_to) opt.routes_to_status = o.routes_to;
      return opt;
    }),
    requires_premise: extra?.requires_premise ?? false,
    requires_authority: extra?.requires_authority ?? false,
    ...(extra?.burden_level ? { burden_level: extra.burden_level } : {}),
  };
}

export function conclusion(
  id: string,
  statement: string,
  direction: Conclusion["direction"] = { kind: "general", position_id: "p1" },
): Conclusion {
  return {
    ...nodeBase(id),
    type: "Conclusion",
    layer: "frame",
    statement,
    direction,
  };
}

export function authority(id: string, citation: string, opts?: Partial<Authority>): Authority {
  return {
    ...nodeBase(id),
    type: "Authority",
    layer: "frame",
    citation,
    ...opts,
  };
}

export function premise(
  id: string,
  statement: string,
  kind: Premise["kind"],
  opts?: { authority_ref?: string; source?: string },
): Premise {
  return {
    ...nodeBase(id),
    type: "Premise",
    layer: "argument",
    statement,
    kind,
    ...(opts?.source ? { source: opts.source } : {}),
    ...(opts?.authority_ref ? { authority_ref: opts.authority_ref } : {}),
  };
}

export function andGate(id: string, inputs: string[], output_target?: string): AndGate {
  return {
    ...nodeBase(id),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "AND",
    inputs,
    ...(output_target ? { output_target } : {}),
  };
}
export function orGate(id: string, inputs: string[], output_target?: string): OrGate {
  return {
    ...nodeBase(id),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "OR",
    inputs,
    ...(output_target ? { output_target } : {}),
  };
}
export function notGate(id: string, input: string, output_target?: string): NotGate {
  return {
    ...nodeBase(id),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "NOT",
    input,
    ...(output_target ? { output_target } : {}),
  };
}
export function ifThenGate(
  id: string,
  antecedent: string,
  consequent: string,
  output_target?: string,
): IfThenGate {
  return {
    ...nodeBase(id),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "IF_THEN",
    antecedent,
    consequent,
    ...(output_target ? { output_target } : {}),
  };
}
export function unlessGate(
  id: string,
  main: string,
  exception: string,
  output_target?: string,
): UnlessGate {
  return {
    ...nodeBase(id),
    type: "LogicalGate",
    layer: "frame",
    gate_type: "UNLESS",
    main,
    exception,
    ...(output_target ? { output_target } : {}),
  };
}

function edgeBase(
  id: string,
  type: Edge["type"],
  source: string,
  target: string,
  layer: "frame" | "argument" = "frame",
) {
  return { id, type, source, target, layer, created_at: T0, updated_at: T0 };
}

export function decomposesInto(id: string, source: string, target: string): Edge {
  return edgeBase(id, "DECOMPOSES_INTO", source, target) as Edge;
}
export function turnsOn(id: string, source: string, target: string): Edge {
  return edgeBase(id, "TURNS_ON", source, target) as Edge;
}
export function interpretedAs(id: string, source: string, target: string): Edge {
  return edgeBase(id, "INTERPRETED_AS", source, target) as Edge;
}
export function leadsTo(id: string, source: string, target: string): Edge {
  return edgeBase(id, "LEADS_TO", source, target) as Edge;
}
export function gates(id: string, source: string, target: string): Edge {
  return edgeBase(id, "GATES", source, target) as Edge;
}
export function forecloses(
  id: string,
  source: string,
  target: string,
  scope: "moot" | "decided" = "moot",
): Edge {
  return { ...edgeBase(id, "FORECLOSES", source, target), scope } as Edge;
}
export function answers(
  id: string,
  source: string,
  target: string,
  selected_option_id: string,
): Edge {
  return { ...edgeBase(id, "ANSWERS", source, target, "argument"), selected_option_id } as Edge;
}
export function supports(
  id: string,
  source: string,
  target: string,
  weight: "strong" | "moderate" | "weak" = "moderate",
): Edge {
  return { ...edgeBase(id, "SUPPORTS", source, target, "argument"), weight } as Edge;
}
export function contradicts(
  id: string,
  source: string,
  target: string,
  weight: "strong" | "moderate" | "weak" = "moderate",
): Edge {
  return { ...edgeBase(id, "CONTRADICTS", source, target, "argument"), weight } as Edge;
}
export function cites(id: string, source: string, target: string): Edge {
  return edgeBase(id, "CITES", source, target) as Edge;
}
export function distinguishedBy(id: string, source: string, target: string): Edge {
  return edgeBase(id, "DISTINGUISHED_BY", source, target) as Edge;
}

// ----- Frame / Session builders -----

export function makeFrame(opts: {
  id: string;
  title: string;
  mode: "legal" | "general";
  flavor?: "personal" | "academic";
  jurisdiction_default?: Frame["jurisdiction_default"];
  version_id: string;
  nodes: Node[];
  edges: Edge[];
  llm_settings_snapshot?: FrameVersion["llm_settings_snapshot"];
}): { frame: Frame; version: FrameVersion } {
  const frame: Frame = {
    id: opts.id,
    title: opts.title,
    mode: opts.mode,
    default_satisfaction_policies: {},
    tags: [],
    pinned: false,
    created_at: T0,
    updated_at: T0,
    current_version_id: opts.version_id,
  };
  if (opts.flavor) frame.flavor = opts.flavor;
  if (opts.jurisdiction_default) frame.jurisdiction_default = opts.jurisdiction_default;
  const version: FrameVersion = {
    id: opts.version_id,
    frame_id: opts.id,
    version_number: 1,
    created_at: T0,
    nodes: opts.nodes,
    edges: opts.edges,
    is_milestone: false,
  };
  if (opts.llm_settings_snapshot) version.llm_settings_snapshot = opts.llm_settings_snapshot;
  return { frame, version };
}

export function makeSession(opts: {
  id: string;
  frame_id: string;
  frame_version_id: string;
  frame_version_snapshot: FrameVersion;
  premises?: Premise[];
  argument_edges?: Edge[];
  session_authorities?: Authority[];
  checkpoint_responses?: ArgumentSession["checkpoint_responses"];
  interpretation_selections?: ArgumentSession["interpretation_selections"];
}): { session: ArgumentSession; version: ArgumentSessionVersion } {
  const session: ArgumentSession = {
    id: opts.id,
    frame_id: opts.frame_id,
    frame_version_id: opts.frame_version_id,
    frame_version_snapshot: opts.frame_version_snapshot,
    title: "Session",
    premises: opts.premises ?? [],
    argument_edges: opts.argument_edges ?? [],
    session_authorities: opts.session_authorities ?? [],
    checkpoint_responses: opts.checkpoint_responses ?? [],
    interpretation_selections: opts.interpretation_selections ?? [],
    status_map: {},
    created_at: T0,
    updated_at: T0,
    current_version_id: opts.id + "-v1",
  };
  const version: ArgumentSessionVersion = {
    id: opts.id + "-v1",
    session_id: opts.id,
    version_number: 1,
    created_at: T0,
    premises: session.premises,
    argument_edges: session.argument_edges,
    session_authorities: session.session_authorities ?? [],
    checkpoint_responses: session.checkpoint_responses,
    interpretation_selections: session.interpretation_selections,
    is_milestone: false,
  };
  return { session, version };
}

// ===== High-level canned fixtures =====

/**
 * Legal-mode fixture with full structural coverage:
 *
 *   Root ─DECOMPOSES_INTO─> SubQ(jurisdictional)
 *   Root ─DECOMPOSES_INTO─> SubQ(merits)
 *   SubQ(merits) ─TURNS_ON─> Term ─INTERPRETED_AS─> Interp1, Interp2
 *   Interp1 ─LEADS_TO─> Conclusion
 *   Interp2 ─LEADS_TO─> Conclusion
 *   Authority ─CITES─> Interp1
 *
 * Session selects Interp1; no Checkpoint on path.
 */
export function buildLegalSimple(): {
  frame: ReturnType<typeof makeFrame>;
  session: ReturnType<typeof makeSession>;
} {
  const nodes: Node[] = [
    root("n-root", "Is liability established?", "de novo"),
    subQ("n-sub-jur", "Does the court have personal jurisdiction?", true),
    subQ("n-sub-merits", "Are the merits met?"),
    term("n-term", "scope-of-duty", 0, false),
    interp("n-interp-a", "Duty exists for foreseeable plaintiffs", "Cardozo view."),
    interp("n-interp-b", "Duty exists only for direct victims", "Andrews view."),
    conclusion("n-concl", "Liability established", { kind: "legal", value: "favors_plaintiff" }),
    authority("n-auth", "Palsgraf v. LIRR, 248 N.Y. 339 (1928)", {
      court: "New York Court of Appeals",
      jurisdiction: { level: "state", region: "New York" },
    }),
  ];
  const edges: Edge[] = [
    decomposesInto("e-d1", "n-root", "n-sub-jur"),
    decomposesInto("e-d2", "n-root", "n-sub-merits"),
    turnsOn("e-turns", "n-sub-merits", "n-term"),
    interpretedAs("e-ia-a", "n-term", "n-interp-a"),
    interpretedAs("e-ia-b", "n-term", "n-interp-b"),
    leadsTo("e-leads-a", "n-interp-a", "n-concl"),
    leadsTo("e-leads-b", "n-interp-b", "n-concl"),
    cites("e-cite", "n-auth", "n-interp-a"),
  ];

  const frame = makeFrame({
    id: "f-legal",
    title: "Legal simple",
    mode: "legal",
    jurisdiction_default: { level: "state", region: "New York" },
    version_id: "fv-legal-1",
    nodes,
    edges,
  });

  const session = makeSession({
    id: "s-legal",
    frame_id: "f-legal",
    frame_version_id: "fv-legal-1",
    frame_version_snapshot: frame.version,
    premises: [],
    argument_edges: [],
    interpretation_selections: [
      {
        term_id: "n-term",
        selected_interpretation_ids: ["n-interp-a"],
        selected_at: T0,
      },
    ],
  });
  return { frame, session };
}

/**
 * Legal-mode fixture with a Checkpoint on the path.
 *
 *   Root ─DECOMPOSES_INTO─> SubQ(jurisdictional)
 *   Root ─DECOMPOSES_INTO─> SubQ(merits)
 *   SubQ(merits) ─TURNS_ON─> Term ─INTERPRETED_AS─> Interp1, Interp2
 *   Interp1 ─LEADS_TO─> Checkpoint
 *   Interp1 ─LEADS_TO─> Conclusion (gives Conclusion an incoming edge)
 *   Interp2 ─LEADS_TO─> Conclusion
 *   Checkpoint option "yes" routes to Conclusion via virtual edge.
 *   Authority ─CITES─> Interp1
 *
 * Session selects Interp1, answers Checkpoint "yes" with a stipulated Premise.
 */
export function buildLegalWithCheckpoint(opts?: {
  premiseKind?: Premise["kind"];
  burden_level?: Checkpoint["burden_level"];
  contradictPremise?: boolean;
  premise_count?: number;
  calibrated_threshold?: number;
}): {
  frame: ReturnType<typeof makeFrame>;
  session: ReturnType<typeof makeSession>;
} {
  const premiseKind = opts?.premiseKind ?? "stipulated";
  const burden = opts?.burden_level ?? "preponderance";
  const nodes: Node[] = [
    root("n-root", "Is liability established?", "de novo"),
    subQ("n-sub-jur", "Personal jurisdiction?", true),
    subQ("n-sub-merits", "Are the merits met?"),
    term("n-term", "scope-of-duty", 0, false),
    interp("n-interp-a", "Duty exists for foreseeable plaintiffs"),
    interp("n-interp-b", "Duty exists only for direct victims"),
    checkpoint(
      "n-cp",
      "Was the harm foreseeable?",
      [
        { id: "yes", label: "Yes", target: "n-concl", satisfies: true },
        { id: "no", label: "No" },
      ],
      { answer_type: "boolean", requires_premise: true, burden_level: burden },
    ),
    conclusion("n-concl", "Liability established", {
      kind: "legal",
      value: "favors_plaintiff",
    }),
    authority("n-auth", "Palsgraf v. LIRR, 248 N.Y. 339 (1928)", {
      court: "New York Court of Appeals",
      jurisdiction: { level: "state", region: "New York" },
    }),
  ];
  const edges: Edge[] = [
    decomposesInto("e-d1", "n-root", "n-sub-jur"),
    decomposesInto("e-d2", "n-root", "n-sub-merits"),
    turnsOn("e-turns", "n-sub-merits", "n-term"),
    interpretedAs("e-ia-a", "n-term", "n-interp-a"),
    interpretedAs("e-ia-b", "n-term", "n-interp-b"),
    leadsTo("e-la1", "n-interp-a", "n-cp"),
    leadsTo("e-la2", "n-interp-a", "n-concl"),
    leadsTo("e-lb", "n-interp-b", "n-concl"),
    cites("e-cite", "n-auth", "n-interp-a"),
  ];

  const llm_settings_snapshot =
    opts?.calibrated_threshold !== undefined
      ? {
          calibrated_thresholds: {
            scintilla: 25,
            preponderance: opts.calibrated_threshold,
            substantial_evidence: 60,
            clear_and_convincing: 85,
            beyond_reasonable_doubt: 95,
            source: "g5_calibrated" as const,
          },
        }
      : undefined;

  const frame = makeFrame({
    id: "f-legal-cp",
    title: "Legal with checkpoint",
    mode: "legal",
    jurisdiction_default: { level: "state", region: "New York" },
    version_id: "fv-legal-cp-1",
    nodes,
    edges,
    ...(llm_settings_snapshot ? { llm_settings_snapshot } : {}),
  });

  // Build premises (one or more).
  const count = opts?.premise_count ?? 1;
  const premises: Premise[] = [];
  const arg_edges: Edge[] = [];
  for (let i = 0; i < count; i++) {
    const pid = `p-${i + 1}`;
    premises.push(premise(pid, `Premise ${i + 1}`, premiseKind, { authority_ref: "n-auth" }));
    arg_edges.push(answers(`ae-${i + 1}`, pid, "n-cp", "yes"));
  }
  if (opts?.contradictPremise) {
    premises.push(premise("p-x", "Contradicting evidence", "disputed"));
    arg_edges.push(contradicts("ae-x", "p-x", "n-cp"));
  }

  const session = makeSession({
    id: "s-legal-cp",
    frame_id: "f-legal-cp",
    frame_version_id: "fv-legal-cp-1",
    frame_version_snapshot: frame.version,
    premises,
    argument_edges: arg_edges,
    interpretation_selections: [
      {
        term_id: "n-term",
        selected_interpretation_ids: ["n-interp-a"],
        selected_at: T0,
      },
    ],
    checkpoint_responses: [
      {
        checkpoint_id: "n-cp",
        selected_option_id: "yes",
        premise_id: premises[0]?.id ?? "p-1",
        answered_at: T0,
      },
    ],
  });
  return { frame, session };
}

/**
 * Academic-mode fixture: two competing Interpretations, two Conclusions,
 * both selected → conditional shape.
 */
export function buildAcademicDispute(): {
  frame: ReturnType<typeof makeFrame>;
  session: ReturnType<typeof makeSession>;
} {
  const nodes: Node[] = [
    root("n-root", "Should we adopt X policy?"),
    subQ("n-sub", "What is the right tradeoff?"),
    term("n-term", "tradeoff-axis", 0, false),
    interp("n-interp-a", "Privileges efficiency"),
    interp("n-interp-b", "Privileges fairness"),
    conclusion("n-concl-a", "Adopt X", { kind: "general", position_id: "adopt" }),
    conclusion("n-concl-b", "Decline X", { kind: "general", position_id: "decline" }),
  ];
  const edges: Edge[] = [
    decomposesInto("e-d", "n-root", "n-sub"),
    turnsOn("e-t", "n-sub", "n-term"),
    interpretedAs("e-ia-a", "n-term", "n-interp-a"),
    interpretedAs("e-ia-b", "n-term", "n-interp-b"),
    leadsTo("e-la", "n-interp-a", "n-concl-a"),
    leadsTo("e-lb", "n-interp-b", "n-concl-b"),
  ];
  const frame = makeFrame({
    id: "f-acad",
    title: "Academic dispute",
    mode: "general",
    flavor: "academic",
    version_id: "fv-acad-1",
    nodes,
    edges,
  });
  const session = makeSession({
    id: "s-acad",
    frame_id: "f-acad",
    frame_version_id: "fv-acad-1",
    frame_version_snapshot: frame.version,
    interpretation_selections: [
      {
        term_id: "n-term",
        selected_interpretation_ids: ["n-interp-a", "n-interp-b"],
        selected_at: T0,
      },
    ],
  });
  return { frame, session };
}
