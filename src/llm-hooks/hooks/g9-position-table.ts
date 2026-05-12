import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";

export interface G9Input {
  topic: string;
  frame_flavor: "personal" | "academic";
  existing_positions: { id: string; label: string; description?: string }[];
}

export interface G9Output {
  positions: { label: string; description?: string }[];
}

export const g9Hook: HookContract<G9Input, G9Output> = {
  id: "G9",
  name: "position_table_suggestion",
  activation: "build_time",
  trigger: "manual",
  mode_visibility: { legal: false, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G9Input {
    const fv = ctx.frame_version;
    const root = fv.nodes.find((n) => n.type === "RootQuestion");
    return {
      topic: root?.type === "RootQuestion" ? root.statement : "",
      frame_flavor: (ctx.frame?.flavor ?? "academic") as "personal" | "academic",
      existing_positions: [],
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G9Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.positions)) {
      return { kind: "parse_error", error: new ParseError("positions must be an array", raw), raw };
    }
    return { kind: "ok", value: { positions: p.positions as G9Output["positions"] } };
  },

  fallback(_input, error): FallbackResult<G9Output> {
    return { kind: "advise_user", message: error.message };
  },

  commit(output): CommitPlan {
    return {
      versioned: true,
      writes: output.positions.map((p) => ({
        field_path: "positions",
        value: { label: p.label, description: p.description },
        op: "append" as const,
      })),
    };
  },
};
