import type { HookContract, HookContext, CommitPlan, FallbackResult } from "../types";
import { ParseAssertError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef } from "@/schema";

export interface G7Input {
  draft_text: string;
  target_checkpoint: { id: NodeRef; question: string; answer_type: string };
  candidate_premises: { id: NodeRef; statement: string; kind: string }[];
  active_path_context: unknown[];
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
}

export interface G7Output {
  ranking: { premise_id: NodeRef; score: number }[];
}

export const g7Hook: HookContract<G7Input, G7Output> = {
  id: "G7",
  name: "premise_reuse_ranking",
  activation: "build_time",
  trigger: "automatic",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G7Input {
    const fv = ctx.frame_version;
    return {
      draft_text: String(ctx.user_input ?? ""),
      target_checkpoint: { id: (ctx.selection ?? "") as NodeRef, question: "", answer_type: "" },
      candidate_premises: fv.nodes
        .filter((n) => n.type === "Premise")
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((n) => ({
          id: n.id as NodeRef,
          statement: n.type === "Premise" ? n.statement : "",
          kind: n.type === "Premise" ? n.kind : "",
        })),
      active_path_context: [],
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(_raw, _schema) {
    throw new ParseAssertError("G7.parseOutput: LLM path not active in v1");
  },

  fallback(input): FallbackResult<G7Output> {
    const ranking = input.candidate_premises
      .map((p) => ({ premise_id: p.id, score: 0 }))
      .sort((a, b) => a.premise_id.localeCompare(b.premise_id));
    return { kind: "deterministic_fallback", value: { ranking } };
  },

  commit(_output, _ctx): CommitPlan {
    return { versioned: false, writes: [] };
  },
};
