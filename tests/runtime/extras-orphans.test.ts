import { describe, it, expect } from "vitest";
import { enumerateOrphanCandidates } from "@/runtime";
import type {
  FrameVersion,
  ArgumentSessionVersion,
  Node,
  Edge,
  RootQuestion,
  Term,
  Checkpoint,
} from "@/schema";

const T = "2026-05-13T00:00:00.000Z";

function root(id: string): RootQuestion {
  return {
    id,
    type: "RootQuestion",
    layer: "frame",
    statement: id,
    created_at: T,
    updated_at: T,
  };
}

function term(id: string, name = id): Term {
  return {
    id,
    type: "Term",
    layer: "frame",
    name,
    order: 0,
    dispositive: false,
    created_at: T,
    updated_at: T,
  };
}

function checkpoint(id: string, question = id): Checkpoint {
  return {
    id,
    type: "Checkpoint",
    layer: "frame",
    question,
    answer_type: "boolean",
    options: [
      { id: `${id}-yes`, label: "Yes", satisfies: true },
      { id: `${id}-no`, label: "No", satisfies: false },
    ],
    requires_premise: false,
    requires_authority: false,
    created_at: T,
    updated_at: T,
  };
}

function edge(id: string, type: Edge["type"], source: string, target: string): Edge {
  return {
    id,
    type,
    layer: "frame",
    source,
    target,
    created_at: T,
    updated_at: T,
  } as Edge;
}

function fv(nodes: Node[], edges: Edge[] = []): FrameVersion {
  return {
    id: "fv-x",
    frame_id: "fr-x",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    nodes,
    edges,
  };
}

function sv(overrides: Partial<ArgumentSessionVersion> = {}): ArgumentSessionVersion {
  return {
    id: "sv-1",
    session_id: "s-1",
    version_number: 1,
    created_at: T,
    is_milestone: false,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    ...overrides,
  };
}

describe("enumerateOrphanCandidates — basic orphan detection", () => {
  it("returns [] when all session references resolve in the target frame", () => {
    const r = root("root");
    const cp = checkpoint("cp-1");
    const target = fv([r, cp]);
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-1",
          selected_option_id: "cp-1-yes",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    expect(enumerateOrphanCandidates(session_version, target)).toHaveLength(0);
  });

  it("emits a checkpoint_answer orphan when the checkpoint is missing from the target", () => {
    const r = root("root");
    const target = fv([r]);
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-deleted",
          selected_option_id: "opt",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target);
    const orphan = result.find((c) => c.source_node_id === "cp-deleted");
    expect(orphan).toBeTruthy();
    expect(orphan!.carrier_kind).toBe("checkpoint_answer");
  });
});

describe("enumerateOrphanCandidates — reattach heuristic (P0-25)", () => {
  it("without a prior frame, all carriers default to discard (back-compat)", () => {
    const r = root("root");
    const target = fv([r]);
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-gone",
          selected_option_id: "opt",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    // No prior frame supplied.
    const result = enumerateOrphanCandidates(session_version, target);
    const orphan = result.find((c) => c.source_node_id === "cp-gone");
    expect(orphan?.suggested_kind).toBe("discard");
    expect(orphan?.reattach_candidates).toBeUndefined();
  });

  it("with a prior frame, finds a same-type same-parent reattach target", () => {
    const r = root("root");
    const cp_old = checkpoint("cp-old");
    const cp_new = checkpoint("cp-new");
    const prior = fv([r, cp_old], [edge("e1", "DECOMPOSES_INTO", "root", "cp-old")]);
    const target = fv([r, cp_new], [edge("e2", "DECOMPOSES_INTO", "root", "cp-new")]);
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-old",
          selected_option_id: "cp-old-yes",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target, prior);
    const orphan = result.find((c) => c.source_node_id === "cp-old");
    expect(orphan?.suggested_kind).toBe("reattach");
    expect(orphan?.reattach_candidates).toBeDefined();
    expect(orphan?.reattach_candidates?.[0]?.target_node_id).toBe("cp-new");
  });

  it("with multiple same-parent target candidates, populates all and picks the lex-first by default", () => {
    const r = root("root");
    const cp_old = checkpoint("cp-old");
    const cp_new_a = checkpoint("cp-a");
    const cp_new_z = checkpoint("cp-z");
    const prior = fv([r, cp_old], [edge("e1", "DECOMPOSES_INTO", "root", "cp-old")]);
    const target = fv(
      [r, cp_new_a, cp_new_z],
      [
        edge("e-a", "DECOMPOSES_INTO", "root", "cp-a"),
        edge("e-z", "DECOMPOSES_INTO", "root", "cp-z"),
      ],
    );
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-old",
          selected_option_id: "cp-old-yes",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target, prior);
    const orphan = result.find((c) => c.source_node_id === "cp-old");
    expect(orphan?.suggested_kind).toBe("reattach");
    expect(orphan?.reattach_candidates?.map((c) => c.target_node_id)).toEqual(["cp-a", "cp-z"]);
  });

  it("falls back to all same-type targets when the orphan has no parent in the prior frame", () => {
    const r = root("root");
    const cp_old = checkpoint("cp-old"); // not connected via parent edges
    const cp_new = checkpoint("cp-new");
    const prior = fv([r, cp_old]); // no DECOMPOSES_INTO edge
    const target = fv([r, cp_new]);
    const session_version = sv({
      checkpoint_responses: [
        { checkpoint_id: "cp-old", selected_option_id: "opt", premise_id: "p-1", answered_at: T },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target, prior);
    const orphan = result.find((c) => c.source_node_id === "cp-old");
    // Without an anchor parent we still offer same-type targets — better than
    // dropping the user off at "discard" with no recourse.
    expect(orphan?.suggested_kind).toBe("reattach");
    expect(orphan?.reattach_candidates?.length).toBeGreaterThan(0);
  });

  it("interpretation_selection: Term reattach via TURNS_ON parent", () => {
    const r = root("root");
    const term_old = term("term-old");
    const term_new = term("term-new");
    const prior = fv([r, term_old], [edge("e1", "TURNS_ON", "root", "term-old")]);
    const target = fv([r, term_new], [edge("e2", "TURNS_ON", "root", "term-new")]);
    const session_version = sv({
      interpretation_selections: [
        { term_id: "term-old", selected_interpretation_ids: ["interp-1"], selected_at: T },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target, prior);
    const orphan = result.find((c) => c.source_node_id === "term-old");
    expect(orphan?.suggested_kind).toBe("reattach");
    expect(orphan?.reattach_candidates?.[0]?.target_node_id).toBe("term-new");
  });

  it("falls back to discard when target has no node of the required type", () => {
    const r = root("root");
    const cp_old = checkpoint("cp-old");
    const prior = fv([r, cp_old], [edge("e1", "DECOMPOSES_INTO", "root", "cp-old")]);
    const target = fv([r]); // No checkpoints at all
    const session_version = sv({
      checkpoint_responses: [
        {
          checkpoint_id: "cp-old",
          selected_option_id: "opt",
          premise_id: "p-1",
          answered_at: T,
        },
      ],
    });
    const result = enumerateOrphanCandidates(session_version, target, prior);
    const orphan = result.find((c) => c.source_node_id === "cp-old");
    expect(orphan?.suggested_kind).toBe("discard");
  });
});
