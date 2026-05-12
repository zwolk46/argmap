import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { ValidationResult, FrameVersion } from "@/schema";

export interface G4Input {
  frame_version: FrameVersion;
  structural_validation_results: ValidationResult[];
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
}

export interface G4Output {
  advisories: ValidationResult[];
}

export const g4Hook: HookContract<G4Input, G4Output> = {
  id: "G4",
  name: "gap_detection",
  activation: "build_time",
  trigger: "automatic",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G4Input {
    return {
      frame_version: ctx.frame_version,
      structural_validation_results: [],
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G4Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.advisories)) {
      return {
        kind: "parse_error",
        error: new ParseError("advisories must be an array", raw),
        raw,
      };
    }
    const capped = (p.advisories as ValidationResult[]).slice(0, 8);
    return { kind: "ok", value: { advisories: capped } };
  },

  fallback(_input, _error): FallbackResult<G4Output> {
    return { kind: "no_op" };
  },

  commit(_output, _ctx): CommitPlan {
    return { versioned: false, writes: [] };
  },
};
