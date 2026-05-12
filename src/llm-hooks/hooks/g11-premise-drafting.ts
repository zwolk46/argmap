import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef } from "@/schema";

export interface G11Input {
  fact_pattern_text: string;
  target_checkpoint: { id: NodeRef; question: string };
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
  premise_kind_vocabulary: string[];
}

export interface G11Output {
  draft_premises: {
    statement: string;
    kind: string;
    source_quote?: string;
  }[];
}

export const g11Hook: HookContract<G11Input, G11Output> = {
  id: "G11",
  name: "premise_drafting_from_fact_pattern",
  activation: "runtime_sidecar",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G11Input {
    const fv = ctx.frame_version;
    const checkpoint_id = ctx.selection as NodeRef;
    const checkpoint = fv.nodes.find((n) => n.id === checkpoint_id);
    return {
      fact_pattern_text: String(ctx.user_input ?? ""),
      target_checkpoint: {
        id: checkpoint_id,
        question: checkpoint?.type === "Checkpoint" ? checkpoint.question : "",
      },
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
      premise_kind_vocabulary: [],
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, input_or_schema): ParseResult<G11Output> {
    const _schema = input_or_schema;
    void _schema;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.draft_premises)) {
      return {
        kind: "parse_error",
        error: new ParseError("draft_premises must be an array", raw),
        raw,
      };
    }
    // Source quote validation requires fact_pattern_text; we skip here since parseOutput
    // doesn't receive the input. The state layer is responsible for validation with access to both.
    return {
      kind: "ok",
      value: { draft_premises: p.draft_premises as G11Output["draft_premises"] },
    };
  },

  fallback(_input, error): FallbackResult<G11Output> {
    return { kind: "advise_user", message: error.message };
  },

  commit(output): CommitPlan {
    const writes: CommitPlan["writes"] = [];
    for (const dp of output.draft_premises) {
      writes.push({
        field_path: "premises",
        value: {
          statement: dp.statement,
          kind: dp.kind,
          source: dp.source_quote ? `Excerpt: ${dp.source_quote}` : undefined,
        },
        op: "create_node",
      });
    }
    return { versioned: true, writes };
  },
};
