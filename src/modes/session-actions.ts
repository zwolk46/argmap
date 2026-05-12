import type {
  ArgumentSession,
  ArgumentSessionVersion,
  CheckpointResponse,
  InterpretationSelection,
} from "@/schema";
import type {
  SessionActionDispatchTable,
  SessionTransformResult,
  DispatchOpts,
  SessionPatch,
} from "@/state";

// ---- Internal helpers ----

function nextSessionVersionRaw(
  v: ArgumentSessionVersion,
  overrides: Partial<ArgumentSessionVersion>,
): ArgumentSessionVersion {
  return { ...v, ...overrides };
}

function replaceOrAddCheckpointResponse(
  responses: CheckpointResponse[],
  next: CheckpointResponse,
): CheckpointResponse[] {
  const idx = responses.findIndex((r) => r.checkpoint_id === next.checkpoint_id);
  if (idx === -1) return [...responses, next];
  return responses.map((r, i) => (i === idx ? next : r));
}

function replaceOrAddInterpretationSelection(
  selections: InterpretationSelection[],
  next: InterpretationSelection,
): InterpretationSelection[] {
  const idx = selections.findIndex((s) => s.term_id === next.term_id);
  if (idx === -1) return [...selections, next];
  return selections.map((s, i) => (i === idx ? next : s));
}

// ---- Dispatch table implementation ----

export const sessionActions: SessionActionDispatchTable = {
  checkpoint_answered(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "checkpoint_answered" }>,
    opts: DispatchOpts,
  ): SessionTransformResult {
    const response: CheckpointResponse = {
      checkpoint_id: patch.node_id,
      selected_option_id: patch.answer.selected_option_id,
      premise_id: patch.answer.premise_id,
      answered_at: opts.now,
      ...(patch.answer.notes !== undefined ? { notes: patch.answer.notes } : {}),
    };
    const checkpoint_responses = replaceOrAddCheckpointResponse(s.checkpoint_responses, response);
    return {
      next_session_raw: { ...s, checkpoint_responses },
      next_version_raw: nextSessionVersionRaw(v, { checkpoint_responses }),
    };
  },

  interpretation_selected(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "interpretation_selected" }>,
    opts: DispatchOpts,
  ): SessionTransformResult {
    let interpretation_selections: InterpretationSelection[];
    if (patch.interpretation_id === null) {
      interpretation_selections = s.interpretation_selections.filter(
        (sel) => sel.term_id !== patch.term_id,
      );
    } else {
      const next: InterpretationSelection = {
        term_id: patch.term_id,
        selected_interpretation_ids: [patch.interpretation_id],
        selected_at: opts.now,
      };
      interpretation_selections = replaceOrAddInterpretationSelection(
        s.interpretation_selections,
        next,
      );
    }
    return {
      next_session_raw: { ...s, interpretation_selections },
      next_version_raw: nextSessionVersionRaw(v, { interpretation_selections }),
    };
  },

  premise_added(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_added" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const premises = [...s.premises, patch.premise];
    return {
      next_session_raw: { ...s, premises },
      next_version_raw: nextSessionVersionRaw(v, { premises }),
    };
  },

  premise_edited(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_edited" }>,
    opts: DispatchOpts,
  ): SessionTransformResult {
    const premises = s.premises.map((p) =>
      p.id === patch.premise_id ? { ...p, ...patch.partial, id: p.id, updated_at: opts.now } : p,
    );
    return {
      next_session_raw: { ...s, premises },
      next_version_raw: nextSessionVersionRaw(v, { premises }),
    };
  },

  premise_removed(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "premise_removed" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const premises = s.premises.filter((p) => p.id !== patch.premise_id);
    return {
      next_session_raw: { ...s, premises },
      next_version_raw: nextSessionVersionRaw(v, { premises }),
    };
  },

  argument_edge_added(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "argument_edge_added" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const argument_edges = [...s.argument_edges, patch.edge];
    return {
      next_session_raw: { ...s, argument_edges },
      next_version_raw: nextSessionVersionRaw(v, { argument_edges }),
    };
  },

  argument_edge_removed(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "argument_edge_removed" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const argument_edges = s.argument_edges.filter((e) => e.id !== patch.edge_id);
    return {
      next_session_raw: { ...s, argument_edges },
      next_version_raw: nextSessionVersionRaw(v, { argument_edges }),
    };
  },

  session_authority_added(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_added" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const session_authorities = [...(s.session_authorities ?? []), patch.authority];
    return {
      next_session_raw: { ...s, session_authorities },
      next_version_raw: nextSessionVersionRaw(v, { session_authorities }),
    };
  },

  session_authority_edited(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_edited" }>,
    opts: DispatchOpts,
  ): SessionTransformResult {
    const session_authorities = (s.session_authorities ?? []).map((a) =>
      a.id === patch.authority_id ? { ...a, ...patch.partial, id: a.id, updated_at: opts.now } : a,
    );
    return {
      next_session_raw: { ...s, session_authorities },
      next_version_raw: nextSessionVersionRaw(v, { session_authorities }),
    };
  },

  session_authority_removed(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_authority_removed" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const session_authorities = (s.session_authorities ?? []).filter(
      (a) => a.id !== patch.authority_id,
    );
    return {
      next_session_raw: { ...s, session_authorities },
      next_version_raw: nextSessionVersionRaw(v, { session_authorities }),
    };
  },

  session_metadata_edited(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    patch: Extract<SessionPatch, { kind: "session_metadata_edited" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    return {
      next_session_raw: { ...s, ...patch.partial },
      next_version_raw: nextSessionVersionRaw(v, {}),
    };
  },

  output_overrides_cleared(
    s: ArgumentSession,
    v: ArgumentSessionVersion,
    _patch: Extract<SessionPatch, { kind: "output_overrides_cleared" }>,
    _opts: DispatchOpts,
  ): SessionTransformResult {
    const { output_overrides: _removed, ...rest } = v;
    return {
      next_session_raw: s,
      next_version_raw: rest as ArgumentSessionVersion,
    };
  },
};
