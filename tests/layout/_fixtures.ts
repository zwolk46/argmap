import type {
  FrameVersion,
  Node,
  Edge,
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  Conclusion,
  Authority,
  Premise,
  AndGate,
} from "@/schema";

const T = "2026-05-11T00:00:00.000Z";

function node(partial: Node): Node {
  return partial;
}

function edge(partial: Edge): Edge {
  return partial;
}

export interface SimpleFrameOpts {
  frameId?: string;
  anchorRoot?: { x?: number; y?: number };
  omitRoot?: boolean;
  withAuthority?: boolean;
  withStrayPremise?: boolean;
}

/**
 * 5-node frame (default):
 *   root_q (RootQuestion)
 *     --DECOMPOSES_INTO--> sq_a (SubQuestion)
 *                            --TURNS_ON--> term_t (Term)
 *                                            --LEADS_TO--> gate_g (LogicalGate AND)
 *                                                            --LEADS_TO--> concl_y (Conclusion)
 */
export function buildSimpleFrame(opts: SimpleFrameOpts = {}): FrameVersion {
  const rootPresentation =
    opts.anchorRoot !== undefined
      ? {
          x: opts.anchorRoot.x,
          y: opts.anchorRoot.y,
        }
      : undefined;

  const root: RootQuestion = {
    id: "root_q",
    type: "RootQuestion",
    layer: "frame",
    statement: "Is the claim sound?",
    presentation: rootPresentation,
    created_at: T,
    updated_at: T,
  };

  const sq: SubQuestion = {
    id: "sq_a",
    type: "SubQuestion",
    layer: "frame",
    statement: "Sub-element A.",
    is_jurisdictional: false,
    created_at: T,
    updated_at: T,
  };

  const term: Term = {
    id: "term_t",
    type: "Term",
    layer: "frame",
    name: "scope",
    order: 0,
    dispositive: true,
    created_at: T,
    updated_at: T,
  };

  const gate: AndGate = {
    id: "gate_g",
    type: "LogicalGate",
    layer: "frame",
    gate_type: "AND",
    inputs: ["term_t"],
    output_target: "concl_y",
    created_at: T,
    updated_at: T,
  };

  const concl: Conclusion = {
    id: "concl_y",
    type: "Conclusion",
    layer: "frame",
    statement: "Conclusion Y.",
    direction: { kind: "general", position_id: "affirm" },
    created_at: T,
    updated_at: T,
  };

  const auth: Authority = {
    id: "auth_1",
    type: "Authority",
    layer: "frame",
    citation: "Auth 1",
    created_at: T,
    updated_at: T,
  };

  const strayPremise: Premise = {
    id: "stray_premise",
    type: "Premise",
    layer: "argument",
    statement: "Stray.",
    kind: "stipulated",
    created_at: T,
    updated_at: T,
  };

  const baseNodes: Node[] = opts.omitRoot ? [sq, term, gate, concl] : [root, sq, term, gate, concl];
  if (opts.withAuthority) baseNodes.push(node(auth));
  if (opts.withStrayPremise) baseNodes.push(node(strayPremise));

  const edges: Edge[] = [
    edge({
      id: "e_dc",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "root_q",
      target: "sq_a",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_g",
      type: "LEADS_TO",
      layer: "frame",
      source: "term_t",
      target: "gate_g",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_lt",
      type: "LEADS_TO",
      layer: "frame",
      source: "gate_g",
      target: "concl_y",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_to",
      type: "TURNS_ON",
      layer: "frame",
      source: "sq_a",
      target: "term_t",
      created_at: T,
      updated_at: T,
    }),
  ];

  // Omit root edge when omitRoot is set
  const frameEdges = opts.omitRoot ? edges.filter((e) => e.source !== "root_q") : edges;

  return {
    id: opts.frameId ?? "fv_simple",
    frame_id: "f_simple",
    version_number: 1,
    is_milestone: false,
    nodes: baseNodes,
    edges: frameEdges,
    created_at: T,
  };
}

/**
 * Frame with two SubQuestions — one collapsed, one open.
 *
 * Visible under collapse_subquestions:true: { root_q, sq_collapsed, sq_open, term_shared, auth_1 }
 * Hidden: { term_a, term_b, concl_x }
 */
export function buildFrameWithCollapsedSubQuestion(): FrameVersion {
  const root: RootQuestion = {
    id: "root_q",
    type: "RootQuestion",
    layer: "frame",
    statement: "Root?",
    created_at: T,
    updated_at: T,
  };

  const sqCollapsed: SubQuestion = {
    id: "sq_collapsed",
    type: "SubQuestion",
    layer: "frame",
    statement: "Collapsed SQ.",
    is_jurisdictional: false,
    presentation: { collapsed: true },
    created_at: T,
    updated_at: T,
  };

  const sqOpen: SubQuestion = {
    id: "sq_open",
    type: "SubQuestion",
    layer: "frame",
    statement: "Open SQ.",
    is_jurisdictional: false,
    created_at: T,
    updated_at: T,
  };

  const termA: Term = {
    id: "term_a",
    type: "Term",
    layer: "frame",
    name: "term a",
    order: 0,
    dispositive: false,
    created_at: T,
    updated_at: T,
  };

  const termB: Term = {
    id: "term_b",
    type: "Term",
    layer: "frame",
    name: "term b",
    order: 1,
    dispositive: false,
    created_at: T,
    updated_at: T,
  };

  const termShared: Term = {
    id: "term_shared",
    type: "Term",
    layer: "frame",
    name: "shared term",
    order: 2,
    dispositive: false,
    created_at: T,
    updated_at: T,
  };

  const conclX: Conclusion = {
    id: "concl_x",
    type: "Conclusion",
    layer: "frame",
    statement: "Conclusion X.",
    direction: { kind: "general", position_id: "deny" },
    created_at: T,
    updated_at: T,
  };

  const auth1: Authority = {
    id: "auth_1",
    type: "Authority",
    layer: "frame",
    citation: "Auth 1",
    created_at: T,
    updated_at: T,
  };

  const nodes: Node[] = [root, sqCollapsed, sqOpen, termA, termB, termShared, conclX, auth1];

  const edges: Edge[] = [
    // Root → both SQs
    edge({
      id: "e_root_coll",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "root_q",
      target: "sq_collapsed",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_root_open",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "root_q",
      target: "sq_open",
      created_at: T,
      updated_at: T,
    }),
    // sq_collapsed's subtree (hidden when collapsed)
    edge({
      id: "e_coll_ta",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "sq_collapsed",
      target: "term_a",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_coll_tb",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "sq_collapsed",
      target: "term_b",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_coll_cx",
      type: "LEADS_TO",
      layer: "frame",
      source: "sq_collapsed",
      target: "concl_x",
      created_at: T,
      updated_at: T,
    }),
    // shared term reachable from both SQs
    edge({
      id: "e_coll_ts",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "sq_collapsed",
      target: "term_shared",
      created_at: T,
      updated_at: T,
    }),
    edge({
      id: "e_open_ts",
      type: "DECOMPOSES_INTO",
      layer: "frame",
      source: "sq_open",
      target: "term_shared",
      created_at: T,
      updated_at: T,
    }),
    // annotation edge from sq_open to auth_1 (CITES: not a BFS edge; auth_1 always visible via Authority rule)
    edge({
      id: "e_open_auth",
      type: "CITES",
      layer: "frame",
      source: "sq_open",
      target: "auth_1",
      created_at: T,
      updated_at: T,
    }),
  ];

  return {
    id: "fv_collapsed",
    frame_id: "f_collapsed",
    version_number: 1,
    is_milestone: false,
    nodes,
    edges,
    created_at: T,
  };
}

/**
 * Frame with root_q → sq_a, and auth_1 cited by sq_a. Authority always visible.
 */
export function buildFrameWithAuthority(): FrameVersion {
  const root: RootQuestion = {
    id: "root_q",
    type: "RootQuestion",
    layer: "frame",
    statement: "Root?",
    created_at: T,
    updated_at: T,
  };

  const sq: SubQuestion = {
    id: "sq_a",
    type: "SubQuestion",
    layer: "frame",
    statement: "Sub A.",
    is_jurisdictional: false,
    created_at: T,
    updated_at: T,
  };

  const auth: Authority = {
    id: "auth_1",
    type: "Authority",
    layer: "frame",
    citation: "Auth 1",
    created_at: T,
    updated_at: T,
  };

  return {
    id: "fv_auth",
    frame_id: "f_auth",
    version_number: 1,
    is_milestone: false,
    nodes: [root, sq, auth],
    edges: [
      edge({
        id: "e_root_sq",
        type: "DECOMPOSES_INTO",
        layer: "frame",
        source: "root_q",
        target: "sq_a",
        created_at: T,
        updated_at: T,
      }),
      edge({
        id: "e_sq_auth",
        type: "CITES",
        layer: "frame",
        source: "sq_a",
        target: "auth_1",
        created_at: T,
        updated_at: T,
      }),
    ],
    created_at: T,
  };
}

/**
 * Procedurally generated frame with approximately approxNodeCount nodes.
 * Structure: root → sqCount SubQuestions, each with Term, Interpretation,
 * Checkpoint children, plus one Conclusion per SQ.
 */
export function buildLargerFrame(approxNodeCount: number): FrameVersion {
  const sqCount = Math.ceil(approxNodeCount / 5);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const root: RootQuestion = {
    id: "root_q",
    type: "RootQuestion",
    layer: "frame",
    statement: "Root question.",
    created_at: T,
    updated_at: T,
  };
  nodes.push(root);

  for (let i = 0; i < sqCount; i++) {
    const sqId = `sq_${i}`;
    const termId = `term_${i}`;
    const interpId = `interp_${i}`;
    const cpId = `cp_${i}`;
    const conclId = `concl_${i}`;

    const sq: SubQuestion = {
      id: sqId,
      type: "SubQuestion",
      layer: "frame",
      statement: `Sub ${i}.`,
      is_jurisdictional: false,
      created_at: T,
      updated_at: T,
    };
    const term: Term = {
      id: termId,
      type: "Term",
      layer: "frame",
      name: `term ${i}`,
      order: i,
      dispositive: false,
      created_at: T,
      updated_at: T,
    };
    const interp: Interpretation = {
      id: interpId,
      type: "Interpretation",
      layer: "frame",
      statement: `Interp ${i}.`,
      created_at: T,
      updated_at: T,
    };
    const cp: Checkpoint = {
      id: cpId,
      type: "Checkpoint",
      layer: "frame",
      question: `Check ${i}?`,
      answer_type: "boolean",
      options: [],
      requires_premise: false,
      requires_authority: false,
      created_at: T,
      updated_at: T,
    };
    const concl: Conclusion = {
      id: conclId,
      type: "Conclusion",
      layer: "frame",
      statement: `Conclusion ${i}.`,
      direction: { kind: "general", position_id: `pos_${i}` },
      created_at: T,
      updated_at: T,
    };

    nodes.push(sq, term, interp, cp, concl);

    edges.push(
      edge({
        id: `e_root_sq${i}`,
        type: "DECOMPOSES_INTO",
        layer: "frame",
        source: "root_q",
        target: sqId,
        created_at: T,
        updated_at: T,
      }),
      edge({
        id: `e_sq${i}_term`,
        type: "TURNS_ON",
        layer: "frame",
        source: sqId,
        target: termId,
        created_at: T,
        updated_at: T,
      }),
      edge({
        id: `e_sq${i}_interp`,
        type: "INTERPRETED_AS",
        layer: "frame",
        source: termId,
        target: interpId,
        created_at: T,
        updated_at: T,
      }),
      edge({
        id: `e_sq${i}_cp`,
        type: "LEADS_TO",
        layer: "frame",
        source: interpId,
        target: cpId,
        created_at: T,
        updated_at: T,
      }),
      edge({
        id: `e_sq${i}_concl`,
        type: "LEADS_TO",
        layer: "frame",
        source: cpId,
        target: conclId,
        created_at: T,
        updated_at: T,
      }),
    );
  }

  return {
    id: "fv_large",
    frame_id: "f_large",
    version_number: 1,
    is_milestone: false,
    nodes,
    edges,
    created_at: T,
  };
}
