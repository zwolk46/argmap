import { describe, it, expect } from "vitest";
import { sessionActions } from "@/modes";
import { makeSession } from "./_fixtures";
import type { ArgumentSessionVersion, Premise, Authority, Edge } from "@/schema";
import type { DispatchOpts, SessionPatch } from "@/state";

const T = "2026-05-10T00:00:00.000Z";

function makeVersion(overrides: Partial<ArgumentSessionVersion> = {}): ArgumentSessionVersion {
  return {
    id: "sv-test",
    session_id: "s-test",
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

const opts: DispatchOpts = { now: T, generateId: () => "gen-1" };

describe("modes/session-actions", () => {
  describe("checkpoint_answered", () => {
    it("creates a CheckpointResponse from the answer", () => {
      const s = makeSession();
      const v = makeVersion();
      const patch: SessionPatch = {
        kind: "checkpoint_answered",
        node_id: "cp-1",
        answer: { selected_option_id: "opt-yes", premise_id: "p-1" },
      };
      const result = sessionActions.checkpoint_answered(s, v, patch, opts);
      expect(result.next_session_raw.checkpoint_responses).toHaveLength(1);
      expect(result.next_session_raw.checkpoint_responses[0]?.checkpoint_id).toBe("cp-1");
      expect(result.next_session_raw.checkpoint_responses[0]?.selected_option_id).toBe("opt-yes");
    });

    it("replaces a prior CheckpointResponse when the same checkpoint is re-answered", () => {
      const prior_response = {
        checkpoint_id: "cp-1",
        selected_option_id: "opt-no",
        premise_id: "p-0",
        answered_at: T,
      };
      const s = makeSession({ checkpoint_responses: [prior_response] });
      const v = makeVersion({ checkpoint_responses: [prior_response] });
      const patch: SessionPatch = {
        kind: "checkpoint_answered",
        node_id: "cp-1",
        answer: { selected_option_id: "opt-yes", premise_id: "p-1" },
      };
      const result = sessionActions.checkpoint_answered(s, v, patch, opts);
      expect(result.next_session_raw.checkpoint_responses).toHaveLength(1);
      expect(result.next_session_raw.checkpoint_responses[0]?.selected_option_id).toBe("opt-yes");
    });
  });

  describe("interpretation_selected", () => {
    it("creates an InterpretationSelection for the named Term", () => {
      const s = makeSession();
      const v = makeVersion();
      const patch: SessionPatch = {
        kind: "interpretation_selected",
        term_id: "term-1",
        interpretation_id: "interp-1",
      };
      const result = sessionActions.interpretation_selected(s, v, patch, opts);
      expect(result.next_session_raw.interpretation_selections).toHaveLength(1);
      expect(result.next_session_raw.interpretation_selections[0]?.term_id).toBe("term-1");
      expect(
        result.next_session_raw.interpretation_selections[0]?.selected_interpretation_ids,
      ).toContain("interp-1");
    });

    it("removes the selection when interpretation_id is null", () => {
      const s = makeSession({
        interpretation_selections: [
          {
            term_id: "term-1",
            selected_interpretation_ids: ["interp-1"],
            selected_at: T,
          },
        ],
      });
      const v = makeVersion();
      const patch: SessionPatch = {
        kind: "interpretation_selected",
        term_id: "term-1",
        interpretation_id: null,
      };
      const result = sessionActions.interpretation_selected(s, v, patch, opts);
      expect(result.next_session_raw.interpretation_selections).toHaveLength(0);
    });
  });

  describe("premise_added", () => {
    it("adds premise to session and version", () => {
      const s = makeSession();
      const v = makeVersion();
      const premise: Premise = {
        id: "p-1",
        type: "Premise",
        layer: "argument",
        statement: "Test premise",
        kind: "empirical",
        created_at: T,
        updated_at: T,
      };
      const result = sessionActions.premise_added(s, v, { kind: "premise_added", premise }, opts);
      expect(result.next_session_raw.premises).toHaveLength(1);
      expect(result.next_version_raw.premises).toHaveLength(1);
    });
  });

  describe("premise_removed", () => {
    it("removes premise by id", () => {
      const premise: Premise = {
        id: "p-1",
        type: "Premise",
        layer: "argument",
        statement: "Test",
        kind: "empirical",
        created_at: T,
        updated_at: T,
      };
      const s = makeSession({ premises: [premise] });
      const v = makeVersion({ premises: [premise] });
      const result = sessionActions.premise_removed(
        s,
        v,
        { kind: "premise_removed", premise_id: "p-1" },
        opts,
      );
      expect(result.next_session_raw.premises).toHaveLength(0);
    });
  });

  describe("argument_edge_added", () => {
    it("adds edge to session and version", () => {
      const s = makeSession();
      const v = makeVersion();
      const edge: Edge = {
        id: "ae-1",
        type: "SUPPORTS",
        layer: "argument",
        source: "p-1",
        target: "cp-1",
        created_at: T,
        updated_at: T,
      };
      const result = sessionActions.argument_edge_added(
        s,
        v,
        { kind: "argument_edge_added", edge },
        opts,
      );
      expect(result.next_session_raw.argument_edges).toHaveLength(1);
    });
  });

  describe("session_authority_added", () => {
    it("adds authority to session_authorities", () => {
      const s = makeSession();
      const v = makeVersion();
      const authority: Authority = {
        id: "auth-1",
        type: "Authority",
        layer: "argument",
        citation: "Test v. Test, 1 U.S. 1",
        created_at: T,
        updated_at: T,
      };
      const result = sessionActions.session_authority_added(
        s,
        v,
        { kind: "session_authority_added", authority },
        opts,
      );
      expect(result.next_session_raw.session_authorities).toHaveLength(1);
    });
  });

  describe("session_metadata_edited", () => {
    it("updates title on next_session_raw", () => {
      const s = makeSession({ title: "Old" });
      const v = makeVersion();
      const result = sessionActions.session_metadata_edited(
        s,
        v,
        { kind: "session_metadata_edited", partial: { title: "New" } },
        opts,
      );
      expect(result.next_session_raw.title).toBe("New");
    });
  });

  describe("output_overrides_cleared", () => {
    it("clears output_overrides from next_version_raw", () => {
      const s = makeSession();
      const v = makeVersion({ output_overrides: { rewritten_prose: "Old prose" } });
      const result = sessionActions.output_overrides_cleared(
        s,
        v,
        { kind: "output_overrides_cleared" },
        opts,
      );
      expect(result.next_version_raw.output_overrides).toBeUndefined();
    });
  });

  describe("frame_version_snapshot immutability", () => {
    it("does not modify frame_version_snapshot across any action", () => {
      const s = makeSession();
      const v = makeVersion();
      const original_snapshot = s.frame_version_snapshot;
      const result = sessionActions.premise_added(
        s,
        v,
        {
          kind: "premise_added",
          premise: {
            id: "p-x",
            type: "Premise",
            layer: "argument",
            statement: "X",
            kind: "empirical",
            created_at: T,
            updated_at: T,
          },
        },
        opts,
      );
      expect(result.next_session_raw.frame_version_snapshot).toBe(original_snapshot);
    });
  });
});
