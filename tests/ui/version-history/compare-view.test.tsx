import { describe, it, expect } from "vitest";
import type {
  ArgumentSessionVersion,
  Premise,
  Authority,
  Edge,
  CheckpointResponse,
  InterpretationSelection,
} from "@/schema";
import type { SessionStructuralDiff } from "@/state";
import { buildSessionRows } from "@/ui/version-history/compare-view";

const T = "2026-05-16T00:00:00.000Z";

function premise(id: string, statement: string): Premise {
  return {
    id,
    type: "Premise",
    layer: "argument",
    statement,
    kind: "stipulated",
    created_at: T,
    updated_at: T,
  };
}

function authority(id: string, citation: string): Authority {
  return {
    id,
    type: "Authority",
    layer: "argument",
    citation,
    created_at: T,
    updated_at: T,
  };
}

function arg_edge(id: string, source: string, target: string): Edge {
  return {
    id,
    type: "SUPPORTS",
    layer: "argument",
    source,
    target,
    created_at: T,
    updated_at: T,
  };
}

function checkpoint_resp(checkpoint_id: string, premise_id: string): CheckpointResponse {
  return {
    checkpoint_id,
    selected_option_id: "yes",
    premise_id,
    answered_at: T,
  };
}

function interp_sel(term_id: string): InterpretationSelection {
  return {
    term_id,
    selected_interpretation_ids: [],
    selected_at: T,
  };
}

function sessionVersion(over: Partial<ArgumentSessionVersion>): ArgumentSessionVersion {
  return {
    id: "sv-stub",
    session_id: "sess-stub",
    version_number: 1,
    is_milestone: false,
    created_at: T,
    premises: [],
    argument_edges: [],
    session_authorities: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    ...over,
  };
}

function emptyDiff(): SessionStructuralDiff {
  return {
    premises: { added: [], removed: [], edited: [] },
    argument_edges: { added: [], removed: [], edited: [] },
    checkpoint_responses: { added: [], removed: [], edited: [] },
    session_authorities: { added: [], removed: [], edited: [] },
    interpretation_selections: { added: [], removed: [], edited: [] },
    metadata: { changed_fields: [] },
  };
}

describe("buildSessionRows (§8 #6 compare-view session-row text)", () => {
  it("premise added/removed/edited rows carry the premise.statement, not the id", () => {
    const a = sessionVersion({
      premises: [premise("p-keep", "kept premise"), premise("p-gone", "removed premise")],
    });
    const b = sessionVersion({
      premises: [premise("p-keep", "edited statement"), premise("p-new", "brand new premise")],
    });
    const diff = emptyDiff();
    diff.premises = {
      added: ["p-new"],
      removed: ["p-gone"],
      edited: [{ id: "p-keep", fields_changed: ["statement"] }],
    };

    const rows = buildSessionRows(a, b, diff);

    expect(rows.premises_added[0]).toMatchObject({
      kind: "node_added",
      node_id: "p-new",
      statement_preview: "brand new premise",
    });
    expect(rows.premises_removed[0]).toMatchObject({
      kind: "node_removed",
      node_id: "p-gone",
      statement_preview: "removed premise",
    });
    expect(rows.premises_edited[0]).toMatchObject({
      kind: "node_edited",
      node_id: "p-keep",
      statement_preview: "edited statement",
    });
  });

  it("authority rows carry .citation", () => {
    const a = sessionVersion({
      session_authorities: [authority("a-old", "Old v. New, 1 U.S. 1 (1900)")],
    });
    const b = sessionVersion({
      session_authorities: [
        authority("a-old", "Old v. New, 1 U.S. 1 (1900)"),
        authority("a-new", "Foo v. Bar, 2 U.S. 2 (2000)"),
      ],
    });
    const diff = emptyDiff();
    diff.session_authorities = {
      added: ["a-new"],
      removed: [],
      edited: [],
    };

    const rows = buildSessionRows(a, b, diff);

    expect(rows.authorities_added[0]).toMatchObject({
      node_type: "Authority",
      statement_preview: "Foo v. Bar, 2 U.S. 2 (2000)",
    });
  });

  it("argument-edge rows carry endpoints + type, not the raw edge id", () => {
    const a = sessionVersion({});
    const b = sessionVersion({
      argument_edges: [arg_edge("e-new", "p-src", "cp-dst")],
    });
    const diff = emptyDiff();
    diff.argument_edges = { added: ["e-new"], removed: [], edited: [] };

    const rows = buildSessionRows(a, b, diff);

    expect(rows.argument_edges_added[0]).toMatchObject({
      kind: "edge_added",
      edge_id: "e-new",
      edge_type: "SUPPORTS",
      endpoints_preview: "SUPPORTS: p-src → cp-dst",
    });
  });

  it("checkpoint + interpretation rows interim: type-prefixed truncated id, not raw uuid", () => {
    const a = sessionVersion({});
    const b = sessionVersion({
      checkpoint_responses: [checkpoint_resp("cp-0123456789abcdef", "p-x")],
      interpretation_selections: [interp_sel("term-fedcba9876543210")],
    });
    const diff = emptyDiff();
    diff.checkpoint_responses = { added: ["cp-0123456789abcdef"], removed: [], edited: [] };
    diff.interpretation_selections = { added: ["term-fedcba9876543210"], removed: [], edited: [] };

    const rows = buildSessionRows(a, b, diff);

    expect(rows.checkpoint_added[0].kind).toBe("node_added");
    if (rows.checkpoint_added[0].kind === "node_added") {
      expect(rows.checkpoint_added[0].statement_preview).toBe("Checkpoint cp-012345678…");
    }
    expect(rows.interp_added[0].kind).toBe("node_added");
    if (rows.interp_added[0].kind === "node_added") {
      expect(rows.interp_added[0].statement_preview).toBe("Term term-fedcba9…");
    }
  });

  it("metadata rows carry the changed field name", () => {
    const a = sessionVersion({});
    const b = sessionVersion({});
    const diff = emptyDiff();
    diff.metadata = { changed_fields: [{ field: "title" }] };

    const rows = buildSessionRows(a, b, diff);

    expect(rows.metadata[0]).toMatchObject({ kind: "metadata_changed", field: "title" });
  });
});
