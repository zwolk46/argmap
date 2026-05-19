import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";

export interface G6Input {
  baseline_prose: string;
  // §12 F-10: which surface the baseline came from. Threaded into echo_input
  // so the SuggestionDrawer can render an explicit "Refining your previous
  // rewrite" vs "Rewriting from canonical" subtitle, closing the audit's
  // "no copy explains this" finding.
  baseline_kind: "canonical" | "rewrite";
  conclusion_direction?: unknown;
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
}

export interface G6Output {
  rewritten_prose: string;
}

export const g6Hook: HookContract<G6Input, G6Output> = {
  id: "G6",
  name: "prose_rewrite",
  activation: "output_time",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G6Input {
    // §12 F-10: accept either a structured { baseline, baseline_kind } payload
    // (current prose-tab call site) or a plain baseline string (the
    // pre-F-10 contract some tests still exercise). Without this, the
    // prior `String(ctx.user_input ?? "")` evaluated to "[object Object]"
    // when given the prose-tab's `{ canonical }` object — a latent crash
    // that was unreachable only because the apply_decision wiring isn't
    // live yet.
    const arg = ctx.user_input;
    let baseline_prose = "";
    let baseline_kind: "canonical" | "rewrite" = "canonical";
    if (typeof arg === "string") {
      baseline_prose = arg;
    } else if (arg && typeof arg === "object") {
      const o = arg as { baseline?: unknown; baseline_kind?: unknown };
      if (typeof o.baseline === "string") baseline_prose = o.baseline;
      if (o.baseline_kind === "rewrite" || o.baseline_kind === "canonical") {
        baseline_kind = o.baseline_kind;
      }
    }
    return {
      baseline_prose,
      baseline_kind,
      conclusion_direction: undefined,
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G6Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.rewritten_prose !== "string" || p.rewritten_prose.trim().length === 0) {
      return {
        kind: "parse_error",
        error: new ParseError("rewritten_prose must be a non-empty string", raw),
        raw,
      };
    }
    return { kind: "ok", value: { rewritten_prose: p.rewritten_prose } };
  },

  fallback(_input, error): FallbackResult<G6Output> {
    return { kind: "advise_user", message: error.message };
  },

  commit(output): CommitPlan {
    return {
      versioned: true,
      writes: [
        {
          field_path: "output_overrides.rewritten_prose",
          value: output.rewritten_prose,
          op: "set",
        },
      ],
    };
  },
};
