import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef } from "@/schema";

export interface G8Input {
  conclusion_statement: string;
  incoming_path: unknown[];
  frame_mode: "legal" | "general";
  positions?: { id: string; label: string }[];
  frame_jurisdiction: string | null;
}

export interface G8Output {
  direction: unknown;
  rationale?: string;
}

export const g8Hook: HookContract<G8Input, G8Output> = {
  id: "G8",
  name: "conclusion_direction_suggestion",
  activation: "build_time",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G8Input {
    const fv = ctx.frame_version;
    const conclusion = fv.nodes.find((n) => n.type === "Conclusion");
    return {
      conclusion_statement: conclusion?.type === "Conclusion" ? conclusion.statement : "",
      incoming_path: [],
      frame_mode: ctx.frame?.mode ?? "general",
      positions: undefined,
      frame_jurisdiction: ctx.frame?.jurisdiction_default?.region ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G8Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!p.direction) {
      return { kind: "parse_error", error: new ParseError("direction is required", raw), raw };
    }
    return {
      kind: "ok",
      value: { direction: p.direction, rationale: p.rationale as string | undefined },
    };
  },

  fallback(_input, error): FallbackResult<G8Output> {
    return { kind: "advise_user", message: error.message };
  },

  commit(output, ctx): CommitPlan {
    return {
      versioned: true,
      writes: [
        {
          target_node_id: ctx.selection as NodeRef,
          field_path: "direction",
          value: output.direction,
          op: "set",
        },
      ],
    };
  },
};
