import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef } from "@/schema";

export interface PathNode {
  type: "RootQuestion" | "SubQuestion" | "Term" | "Interpretation" | "Checkpoint" | "LogicalGate";
  text: string;
  resolution?: string;
}

export interface G3Input {
  conclusion: { id: NodeRef; statement: string; direction: unknown };
  incoming_path: PathNode[];
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
  frame_jurisdiction: string | null;
  positions?: { id: string; label: string }[];
}

export interface G3Output {
  reasoning_summary: string;
}

export const g3Hook: HookContract<G3Input, G3Output> = {
  id: "G3",
  name: "conclusion_reasoning_summary",
  activation: "build_time",
  trigger: "manual_with_auto_offer",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G3Input {
    const fv = ctx.frame_version;
    const conclusion = fv.nodes.find((n) => n.type === "Conclusion");
    return {
      conclusion: {
        id: (conclusion?.id ?? "") as NodeRef,
        statement: conclusion?.type === "Conclusion" ? conclusion.statement : "",
        direction: conclusion?.type === "Conclusion" ? conclusion.direction : null,
      },
      incoming_path: [],
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
      frame_jurisdiction: ctx.frame?.jurisdiction_default?.region ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G3Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.reasoning_summary !== "string" || p.reasoning_summary.trim().length === 0) {
      return {
        kind: "parse_error",
        error: new ParseError("reasoning_summary must be a non-empty string", raw),
        raw,
      };
    }
    const wordCount = p.reasoning_summary.trim().split(/\s+/).length;
    if (wordCount > 120) {
      return {
        kind: "parse_error",
        error: new ParseError("reasoning_summary exceeds 120 words", raw),
        raw,
      };
    }
    return { kind: "ok", value: { reasoning_summary: p.reasoning_summary } };
  },

  fallback(_input, error): FallbackResult<G3Output> {
    if (error.kind === "provider_error") return { kind: "no_op" };
    return { kind: "advise_user", message: error.message };
  },

  commit(output, ctx): CommitPlan {
    return {
      versioned: true,
      writes: [
        {
          target_node_id: ctx.selection as NodeRef,
          field_path: "reasoning_summary",
          value: output.reasoning_summary,
          op: "set",
        },
      ],
    };
  },
};
