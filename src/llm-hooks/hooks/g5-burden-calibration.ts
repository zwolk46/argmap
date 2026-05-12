import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { BurdenThresholdMap } from "@/schema";
import { sortedEntries } from "@/runtime/iteration-helpers";

export interface G5Input {
  standard_of_review: string;
  current_thresholds: BurdenThresholdMap;
  frame_jurisdiction: string | null;
}

export interface G5Output {
  thresholds: BurdenThresholdMap;
  rationale: string;
}

export const g5Hook: HookContract<G5Input, G5Output> = {
  id: "G5",
  name: "burden_threshold_calibration",
  activation: "build_time",
  trigger: "manual_with_auto_offer",
  mode_visibility: { legal: true, general: { personal: false, academic: false } },

  buildInput(ctx: HookContext): G5Input {
    const fv = ctx.frame_version;
    const root = fv.nodes.find((n) => n.type === "RootQuestion");
    return {
      standard_of_review: root?.type === "RootQuestion" ? (root.standard_of_review ?? "") : "",
      current_thresholds: (fv.llm_settings_snapshot?.calibrated_thresholds ??
        {}) as BurdenThresholdMap,
      frame_jurisdiction: ctx.frame?.jurisdiction_default?.region ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G5Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!p.thresholds || typeof p.thresholds !== "object" || Array.isArray(p.thresholds)) {
      return {
        kind: "parse_error",
        error: new ParseError("thresholds must be an object", raw),
        raw,
      };
    }
    for (const [, v] of sortedEntries(p.thresholds as Record<string, unknown>)) {
      if (typeof v !== "number" || v < 0 || v > 100) {
        return {
          kind: "parse_error",
          error: new ParseError("all threshold values must be numbers in [0, 100]", raw),
          raw,
        };
      }
    }
    return {
      kind: "ok",
      value: {
        thresholds: p.thresholds as BurdenThresholdMap,
        rationale: String(p.rationale ?? ""),
      },
    };
  },

  fallback(_input, error): FallbackResult<G5Output> {
    if (error.kind === "provider_error") return { kind: "no_op" };
    return { kind: "advise_user", message: error.message };
  },

  commit(output): CommitPlan {
    return {
      versioned: true,
      writes: [
        { field_path: "llm_settings.calibrated_thresholds", value: output.thresholds, op: "set" },
        {
          field_path: "llm_settings_snapshot.calibrated_thresholds",
          value: output.thresholds,
          op: "set",
        },
      ],
    };
  },
};
