import { compute } from "@/runtime";
import type { ComputeInput, ComputeResult } from "@/runtime";
import type { ArgumentSession } from "@/schema";

export interface ComputeDriver {
  runFor(session: ArgumentSession, at?: string): ComputeResult;
  buildInput(session: ArgumentSession, computed_at: string): ComputeInput;
}

export interface CreateComputeDriverOpts {
  now: () => string;
}

export function createComputeDriver(opts: CreateComputeDriverOpts): ComputeDriver {
  const { now } = opts;

  function buildInput(session: ArgumentSession, computed_at: string): ComputeInput {
    const input: ComputeInput = {
      frame_version_snapshot: session.frame_version_snapshot,
      checkpoint_responses: session.checkpoint_responses,
      interpretation_selections: session.interpretation_selections,
      premises: session.premises,
      argument_edges: session.argument_edges,
      session_authorities: session.session_authorities ?? [],
      computed_at,
    };
    // F-028: thread the FrameVersion-snapshotted jurisdiction_default through
    // ComputeInput so the legal-mode authority_binding condition can evaluate.
    // Without this, condAuthorityBinding always saw `undefined` and "binding
    // authority" was unreachable — silently neutering an editable Frame field.
    const snap_jur = session.frame_version_snapshot.jurisdiction_default;
    if (snap_jur) input.jurisdiction_default = snap_jur;
    return input;
  }

  return {
    buildInput,
    runFor(session: ArgumentSession, at?: string): ComputeResult {
      const computed_at = at ?? now();
      return compute(buildInput(session, computed_at));
    },
  };
}
