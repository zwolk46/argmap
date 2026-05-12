// Compositional fixtures for validation-rule tests. `cleanReference()` returns
// a known-good legal-mode FrameVersion + ArgumentSession. Each mutation helper
// breaks exactly one rule. Per the advisor's guidance: don't hand-roll 39
// independent FrameVersions — clone the clean reference and mutate.

import type {
  ArgumentSession,
  Authority,
  Checkpoint,
  Conclusion,
  Edge,
  FrameVersion,
  IfThenGate,
  Interpretation,
  Node,
  Premise,
  RootQuestion,
  SubQuestion,
  Term,
} from "@/schema";

export type Bundle = { frame: FrameVersion; session?: ArgumentSession };

const T = "2026-05-01T12:00:00.000Z";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// ----------------------------------------------------------------------------
// Clean reference. Hand-built so we can precisely control what fires per rule.
// Designed to pass every error-severity rule AND not trip warnings either.
// ----------------------------------------------------------------------------

export function cleanReference(): Bundle {
  const root: RootQuestion = {
    id: "n-root",
    type: "RootQuestion",
    layer: "frame",
    statement: "Is the claim sound?",
    standard_of_review: "de_novo",
    created_at: T,
    updated_at: T,
  };
  const subDuty: SubQuestion = {
    id: "n-sub-duty",
    type: "SubQuestion",
    layer: "frame",
    statement: "Element 1.",
    is_jurisdictional: false,
    created_at: T,
    updated_at: T,
  };
  const subJur: SubQuestion = {
    id: "n-sub-jur",
    type: "SubQuestion",
    layer: "frame",
    statement: "Element jurisdiction.",
    is_jurisdictional: true,
    created_at: T,
    updated_at: T,
  };
  const term: Term = {
    id: "n-term",
    type: "Term",
    layer: "frame",
    name: "scope",
    order: 0,
    dispositive: true,
    created_at: T,
    updated_at: T,
  };
  const interpA: Interpretation = {
    id: "n-i-a",
    type: "Interpretation",
    layer: "frame",
    statement: "Broad.",
    notes: "background",
    created_at: T,
    updated_at: T,
  };
  const interpB: Interpretation = {
    id: "n-i-b",
    type: "Interpretation",
    layer: "frame",
    statement: "Narrow.",
    notes: "background",
    created_at: T,
    updated_at: T,
  };
  const cp: Checkpoint = {
    id: "n-cp",
    type: "Checkpoint",
    layer: "frame",
    question: "Met the standard?",
    answer_type: "boolean",
    options: [
      { id: "opt-y", label: "yes", satisfies: true, target_node_id: "n-concl" },
      { id: "opt-n", label: "no", satisfies: false },
    ],
    requires_premise: true,
    requires_authority: true,
    burden_level: "preponderance",
    created_at: T,
    updated_at: T,
  };
  const gate: IfThenGate = {
    id: "n-gate",
    type: "LogicalGate",
    layer: "frame",
    gate_type: "IF_THEN",
    antecedent: "n-i-a",
    consequent: "n-cp",
    created_at: T,
    updated_at: T,
  };
  const concl: Conclusion = {
    id: "n-concl",
    type: "Conclusion",
    layer: "frame",
    statement: "Plaintiff prevails.",
    direction: { kind: "legal", value: "favors_plaintiff" },
    created_at: T,
    updated_at: T,
  };
  const authority: Authority = {
    id: "n-auth",
    type: "Authority",
    layer: "frame",
    citation: "Test v. Test, 1 U.S. 1 (2026).",
    is_binding: true,
    jurisdiction: { level: "federal" },
    created_at: T,
    updated_at: T,
  };

  const edges: Edge[] = [
    {
      id: "e-decomp-duty",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-root",
      target: "n-sub-duty",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-decomp-jur",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-root",
      target: "n-sub-jur",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-turns-on",
      type: "TURNS_ON",
      layer: "frame",
      source: "n-sub-duty",
      target: "n-term",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-interp-a",
      type: "INTERPRETED_AS",
      layer: "frame",
      source: "n-term",
      target: "n-i-a",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-interp-b",
      type: "INTERPRETED_AS",
      layer: "frame",
      source: "n-term",
      target: "n-i-b",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-leads-a",
      type: "LEADS_TO",
      layer: "frame",
      source: "n-i-a",
      target: "n-cp",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-leads-b",
      type: "LEADS_TO",
      layer: "frame",
      source: "n-i-b",
      target: "n-cp",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-leads-concl-a",
      type: "LEADS_TO",
      layer: "frame",
      source: "n-i-a",
      target: "n-concl",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-leads-concl-b",
      type: "LEADS_TO",
      layer: "frame",
      source: "n-i-b",
      target: "n-concl",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-leads-a-gate",
      type: "LEADS_TO",
      layer: "frame",
      source: "n-i-a",
      target: "n-gate",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-gates-concl",
      type: "GATES",
      layer: "frame",
      source: "n-gate",
      target: "n-concl",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-cites",
      type: "CITES",
      layer: "frame",
      source: "n-auth",
      target: "n-i-a",
      created_at: T,
      updated_at: T,
    },
    {
      id: "e-cites-b",
      type: "CITES",
      layer: "frame",
      source: "n-auth",
      target: "n-i-b",
      created_at: T,
      updated_at: T,
    },
  ];

  const nodes: Node[] = [root, subDuty, subJur, term, interpA, interpB, cp, gate, concl, authority];

  const frame: FrameVersion = {
    id: "fv",
    frame_id: "f",
    version_number: 1,
    is_milestone: true,
    nodes,
    edges,
    created_at: T,
  };

  const premise: Premise = {
    id: "n-prem",
    type: "Premise",
    layer: "argument",
    statement: "P.",
    kind: "found",
    authority_ref: "n-auth",
    created_at: T,
    updated_at: T,
  };

  const session: ArgumentSession = {
    id: "s",
    frame_id: "f",
    frame_version_id: "fv",
    frame_version_snapshot: frame,
    title: "S",
    premises: [premise],
    argument_edges: [
      {
        id: "ae",
        type: "ANSWERS",
        layer: "argument",
        source: "n-prem",
        target: "n-cp",
        selected_option_id: "opt-y",
        created_at: T,
        updated_at: T,
      },
    ],
    session_authorities: [],
    checkpoint_responses: [
      {
        checkpoint_id: "n-cp",
        selected_option_id: "opt-y",
        premise_id: "n-prem",
        answered_at: T,
      },
    ],
    interpretation_selections: [
      {
        term_id: "n-term",
        selected_interpretation_ids: ["n-i-a"],
        selected_at: T,
      },
    ],
    status_map: {},
    created_at: T,
    updated_at: T,
    current_version_id: "sv",
  };

  return { frame, session };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function withMutFrame(mutate: (b: Bundle) => void): Bundle {
  const b = { frame: clone(cleanReference().frame), session: clone(cleanReference().session) };
  mutate(b);
  // Re-link snapshot so session-side rules see the mutated frame when applicable.
  if (b.session) b.session.frame_version_snapshot = b.frame;
  return b;
}

// ----------------------------------------------------------------------------
// V-FR
// ----------------------------------------------------------------------------

export function frameWithTwoRoots(): Bundle {
  return withMutFrame(({ frame }) => {
    const extra: RootQuestion = {
      id: "n-root-2",
      type: "RootQuestion",
      layer: "frame",
      statement: "Duplicate root.",
      created_at: T,
      updated_at: T,
    };
    frame.nodes.push(extra);
  });
}

export function frameWithOrphanSubQuestion(): Bundle {
  return withMutFrame(({ frame }) => {
    const orphan: SubQuestion = {
      id: "n-sub-orphan",
      type: "SubQuestion",
      layer: "frame",
      statement: "Detached.",
      is_jurisdictional: false,
      created_at: T,
      updated_at: T,
    };
    frame.nodes.push(orphan);
  });
}

export function termWithOneInterpretationNoLink(): Bundle {
  return withMutFrame(({ frame }) => {
    // Remove one of the two INTERPRETED_AS edges from the term to leave only one.
    frame.edges = frame.edges.filter((e) => e.id !== "e-interp-b");
    // Also remove the dangling Interpretation node so it doesn't trip orphan rules
    frame.nodes = frame.nodes.filter((n) => n.id !== "n-i-b");
    // Drop the LEADS_TO edges involving the removed Interpretation.
    frame.edges = frame.edges.filter((e) => e.source !== "n-i-b" && e.target !== "n-i-b");
  });
}

export function checkpointUnreachable(): Bundle {
  // V-FR-4: detach the LEADS_TO edges into n-cp so it isn't reachable.
  return withMutFrame(({ frame }) => {
    frame.edges = frame.edges.filter((e) => !(e.type === "LEADS_TO" && e.target === "n-cp"));
    // Also drop the gate's consequent reference by removing the gate (so V-NODE-1
    // doesn't fire on gate.consequent dangling — but that's actually still
    // resolved within the frame, so leaving the gate intact is fine).
  });
}

export function conclusionUnreachable(): Bundle {
  return withMutFrame(({ frame }) => {
    // Detach everything pointing at n-concl.
    frame.edges = frame.edges.filter((e) => e.target !== "n-concl");
    // The Checkpoint's option still points at n-concl; remove its satisfies flag
    // so V-NODE-8 doesn't fire as well.
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.options[0].satisfies = false;
    cp.options[0].target_node_id = undefined;
    // After detaching, the checkpoint also won't reach a Conclusion; rules
    // V-FR-8 and V-FR-5 will both fire. The test asserts >= 1 V-FR-5 match;
    // additional V-FR-8 matches are tolerable.
  });
}

export function frameWithCycle(): Bundle {
  return withMutFrame(({ frame }) => {
    // Inject a DECOMPOSES_INTO from sub-duty back to root (cycle).
    frame.edges.push({
      id: "e-cycle",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-sub-duty",
      target: "n-root",
      created_at: T,
      updated_at: T,
    });
  });
}

export function legalFrameWithoutJurisdictional(): Bundle {
  return withMutFrame(({ frame }) => {
    const sub = frame.nodes.find((n) => n.id === "n-sub-jur") as SubQuestion;
    sub.is_jurisdictional = false;
  });
}

export function danglingTerm(): Bundle {
  // V-FR-8: a Checkpoint that doesn't reach Conclusion.
  return withMutFrame(({ frame }) => {
    // Remove all LEADS_TO edges out of n-cp and out of n-i-a/b that target Conclusion.
    frame.edges = frame.edges.filter((e) => !(e.type === "LEADS_TO" && e.target === "n-concl"));
    // Make sure the LEADS_TO from n-cp toward concl is gone (already removed above).
    // Also break the Checkpoint option's terminal-answer target so V-NODE-8 doesn't fire.
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.options[0].target_node_id = undefined;
    cp.options[0].satisfies = false;
  });
}

export function compoundCheckpoint(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.question = "Is duty established and is breach proven beyond any reasonable doubt?";
  });
}

export function generalFrameMissingPosition(): Bundle {
  return withMutFrame(({ frame }) => {
    const concl = frame.nodes.find((n) => n.id === "n-concl") as Conclusion;
    concl.direction = { kind: "general", position_id: "" };
  });
}

export function bindingAuthorityWithoutJurisdiction(): Bundle {
  return withMutFrame(({ frame }) => {
    const a = frame.nodes.find((n) => n.id === "n-auth") as Authority;
    a.is_binding = true;
    delete (a as Partial<Authority>).jurisdiction;
  });
}

export function interpretationWithoutCitesOrNotes(): Bundle {
  return withMutFrame(({ frame }) => {
    // n-i-a is cited; n-i-b is also cited in clean reference. Remove the CITES
    // edge to n-i-b and clear its notes.
    frame.edges = frame.edges.filter((e) => !(e.type === "CITES" && e.target === "n-i-b"));
    const i = frame.nodes.find((n) => n.id === "n-i-b") as Interpretation;
    i.notes = "";
  });
}

// ----------------------------------------------------------------------------
// V-NODE
// ----------------------------------------------------------------------------

export function edgeRefMissing(): Bundle {
  return withMutFrame(({ frame }) => {
    // Add an edge whose source/target don't exist.
    frame.edges.push({
      id: "e-bogus",
      type: "GATES",
      layer: "frame",
      source: "no-such-node",
      target: "n-concl",
      created_at: T,
      updated_at: T,
    });
  });
}

export function nodeShapeMismatch(): Bundle {
  return withMutFrame(({ frame }) => {
    const t = frame.nodes.find((n) => n.id === "n-term") as Term;
    delete (t as Partial<Term>).order;
  });
}

export function termLinkCycle(): Bundle {
  return withMutFrame(({ frame }) => {
    // Create two Terms that link to each other in a cycle.
    const a: Term = {
      id: "n-term-a",
      type: "Term",
      layer: "frame",
      name: "a",
      order: 1,
      dispositive: false,
      linked_to: "n-term-b",
      created_at: T,
      updated_at: T,
    };
    const b: Term = {
      id: "n-term-b",
      type: "Term",
      layer: "frame",
      name: "b",
      order: 2,
      dispositive: false,
      linked_to: "n-term-a",
      created_at: T,
      updated_at: T,
    };
    frame.nodes.push(a, b);
    // Wire them up structurally to avoid V-FR-2 from firing on these new nodes.
    frame.edges.push(
      {
        id: "e-tlink-a",
        type: "TURNS_ON",
        layer: "frame",
        source: "n-sub-duty",
        target: "n-term-a",
        created_at: T,
        updated_at: T,
      },
      {
        id: "e-tlink-b",
        type: "TURNS_ON",
        layer: "frame",
        source: "n-sub-duty",
        target: "n-term-b",
        created_at: T,
        updated_at: T,
      },
    );
  });
}

export function termLinkToNonTerm(): Bundle {
  return withMutFrame(({ frame }) => {
    const t = frame.nodes.find((n) => n.id === "n-term") as Term;
    t.linked_to = "n-concl"; // not a Term
  });
}

export function booleanCheckpointWrongOptionCount(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.options = [{ id: "opt-only", label: "only", satisfies: true, target_node_id: "n-concl" }];
  });
}

export function gradedCheckpointWrongOptionCount(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.answer_type = "graded";
    cp.options = [
      { id: "opt-met", label: "met", satisfies: true, target_node_id: "n-concl" },
      { id: "opt-unmet", label: "unmet", satisfies: false },
    ];
  });
}

export function multipleChoiceTooFew(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.answer_type = "multiple_choice";
    cp.options = [{ id: "opt-only", label: "only", satisfies: true, target_node_id: "n-concl" }];
  });
}

export function satisfyingOptionMissingTarget(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.options[0].target_node_id = undefined;
    // remove the LEADS_TO from cp to concl so the terminal-answer escape doesn't apply
    frame.edges = frame.edges.filter((e) => !(e.id === "e-leads-cp-concl"));
  });
}

export function duplicateOptionIds(): Bundle {
  return withMutFrame(({ frame }) => {
    const cp = frame.nodes.find((n) => n.id === "n-cp") as Checkpoint;
    cp.options = [
      { id: "dup", label: "yes", satisfies: true, target_node_id: "n-concl" },
      { id: "dup", label: "no", satisfies: false },
    ];
  });
}

// ----------------------------------------------------------------------------
// V-EDGE
// ----------------------------------------------------------------------------

export function badEdgeTypePair(): Bundle {
  return withMutFrame(({ frame }) => {
    frame.edges.push({
      id: "e-bad-pair",
      type: "TURNS_ON",
      layer: "frame",
      source: "n-concl", // Conclusion is not a valid TURNS_ON source
      target: "n-term",
      created_at: T,
      updated_at: T,
    });
  });
}

export function duplicateEdge(): Bundle {
  return withMutFrame(({ frame }) => {
    frame.edges.push({
      id: "e-dup",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-root",
      target: "n-sub-duty", // exact duplicate of e-decomp-duty
      created_at: T,
      updated_at: T,
    });
  });
}

export function argEdgeInFrameLayer(): Bundle {
  return withMutFrame(({ frame }) => {
    frame.edges.push({
      id: "e-wrong-layer",
      type: "ANSWERS",
      layer: "argument",
      source: "n-prem",
      target: "n-cp",
      selected_option_id: "opt-y",
      created_at: T,
      updated_at: T,
    });
  });
}

export function frameEdgeInArgLayer(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    b.session.argument_edges.push({
      id: "e-misplaced",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-root",
      target: "n-sub-duty",
      created_at: T,
      updated_at: T,
    });
  });
}

// ----------------------------------------------------------------------------
// V-GATE
// ----------------------------------------------------------------------------

export function andGateTooFewInputs(): Bundle {
  return withMutFrame(({ frame }) => {
    // Replace the IF_THEN gate with an AND that has 1 input.
    const idx = frame.nodes.findIndex((n) => n.id === "n-gate");
    frame.nodes[idx] = {
      id: "n-gate",
      type: "LogicalGate",
      layer: "frame",
      gate_type: "AND",
      inputs: ["n-i-a"],
      created_at: T,
      updated_at: T,
    } as Node;
  });
}

export function notGateMissingInput(): Bundle {
  return withMutFrame(({ frame }) => {
    const idx = frame.nodes.findIndex((n) => n.id === "n-gate");
    frame.nodes[idx] = {
      id: "n-gate",
      type: "LogicalGate",
      layer: "frame",
      gate_type: "NOT",
      // intentionally missing 'input'
      created_at: T,
      updated_at: T,
    } as unknown as Node;
  });
}

export function ifThenMissingSlot(): Bundle {
  return withMutFrame(({ frame }) => {
    const g = frame.nodes.find((n) => n.id === "n-gate") as IfThenGate;
    delete (g as Partial<IfThenGate>).consequent;
  });
}

export function unlessMissingSlot(): Bundle {
  return withMutFrame(({ frame }) => {
    const idx = frame.nodes.findIndex((n) => n.id === "n-gate");
    frame.nodes[idx] = {
      id: "n-gate",
      type: "LogicalGate",
      layer: "frame",
      gate_type: "UNLESS",
      main: "n-i-a",
      // missing 'exception'
      created_at: T,
      updated_at: T,
    } as unknown as Node;
  });
}

export function gateInputIsTerm(): Bundle {
  return withMutFrame(({ frame }) => {
    const g = frame.nodes.find((n) => n.id === "n-gate") as IfThenGate;
    g.antecedent = "n-term";
  });
}

export function gateInputIsPremise(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    // Put a Premise into the frame for the gate to reference. Awkward but
    // V-GATE-6 explicitly tests for this case.
    const premiseInFrame: Premise = {
      id: "n-prem-in-frame",
      type: "Premise",
      layer: "argument",
      statement: "Misplaced",
      kind: "stipulated",
      created_at: T,
      updated_at: T,
    };
    b.frame.nodes.push(premiseInFrame);
    const g = b.frame.nodes.find((n) => n.id === "n-gate") as IfThenGate;
    g.antecedent = "n-prem-in-frame";
  });
}

// ----------------------------------------------------------------------------
// V-ARG
// ----------------------------------------------------------------------------

export function responseMissingCheckpoint(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    b.session.checkpoint_responses.push({
      checkpoint_id: "no-such-cp",
      selected_option_id: "opt-y",
      premise_id: "n-prem",
      answered_at: T,
    });
  });
}

export function premiseMissingAuthority(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    const p = b.session.premises.find((p) => p.id === "n-prem")!;
    delete p.authority_ref;
  });
}

export function premiseWrongKindForMode(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    // Legal vocab: stipulated/found/disputed/procedural. Use an academic-only kind.
    b.session.premises[0].kind = "empirical";
  });
}

export function authorityRefDoesNotResolve(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    b.session.premises[0].authority_ref = "no-such-authority";
  });
}

export function contestedCheckpoint(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    const extra: Premise = {
      id: "n-prem-2",
      type: "Premise",
      layer: "argument",
      statement: "Counter.",
      kind: "disputed",
      authority_ref: "n-auth",
      created_at: T,
      updated_at: T,
    };
    b.session.premises.push(extra);
    b.session.argument_edges.push({
      id: "ae-contradict",
      type: "CONTRADICTS",
      layer: "argument",
      source: "n-prem-2",
      target: "n-cp",
      created_at: T,
      updated_at: T,
    });
  });
}

export function selectionNotInterpretedAs(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    // Try to select the Conclusion under the Term — not an INTERPRETED_AS child.
    b.session.interpretation_selections[0].selected_interpretation_ids = ["n-concl"];
  });
}

export function termOnPathMissingSelection(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    b.session.active_path = ["n-root", "n-sub-duty", "n-term"];
    b.session.interpretation_selections = []; // none
  });
}

export function selectionOnLinkedTerm(): Bundle {
  return withMutFrame((b) => {
    if (!b.session) return;
    // Add a linked Term and select on it.
    const linkedTerm: Term = {
      id: "n-term-linked",
      type: "Term",
      layer: "frame",
      name: "linked",
      order: 1,
      dispositive: false,
      linked_to: "n-term",
      created_at: T,
      updated_at: T,
    };
    b.frame.nodes.push(linkedTerm);
    b.frame.edges.push({
      id: "e-turns-on-linked",
      type: "TURNS_ON",
      layer: "frame",
      source: "n-sub-duty",
      target: "n-term-linked",
      created_at: T,
      updated_at: T,
    });
    b.session.frame_version_snapshot = b.frame;
    b.session.interpretation_selections.push({
      term_id: "n-term-linked",
      selected_interpretation_ids: [],
      selected_at: T,
    });
  });
}

// ----------------------------------------------------------------------------
// Aggregate / diagnostic helper
// ----------------------------------------------------------------------------

export function frameWithMultipleErrors(): Bundle {
  // Two-roots + cycle + dangling Checkpoint, used for the order-stability test.
  return withMutFrame(({ frame }) => {
    const extra: RootQuestion = {
      id: "n-root-2",
      type: "RootQuestion",
      layer: "frame",
      statement: "extra",
      created_at: T,
      updated_at: T,
    };
    frame.nodes.push(extra);
    frame.edges.push({
      id: "e-cycle",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "n-sub-duty",
      target: "n-root",
      created_at: T,
      updated_at: T,
    });
  });
}
