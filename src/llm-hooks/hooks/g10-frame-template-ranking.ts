import type { HookContract, HookContext, CommitPlan, FallbackResult } from "../types";
import { ParseAssertError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { FrameId } from "@/schema";

export interface G10Input {
  topic: string;
  candidate_frames: { id: FrameId; title: string; description?: string; tags?: string[] }[];
  frame_mode: "legal" | "general";
}

export interface G10Output {
  ranking: { frame_id: FrameId; score: number }[];
}

export const g10Hook: HookContract<G10Input, G10Output> = {
  id: "G10",
  name: "frame_template_ranking",
  activation: "build_time",
  trigger: "automatic",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G10Input {
    const fv = ctx.frame_version;
    const root = fv.nodes.find((n) => n.type === "RootQuestion");
    return {
      topic: root?.type === "RootQuestion" ? root.statement : "",
      candidate_frames: [],
      frame_mode: ctx.frame?.mode ?? "general",
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(_raw, _schema) {
    throw new ParseAssertError("G10.parseOutput: LLM path not active in v1");
  },

  fallback(input): FallbackResult<G10Output> {
    const topic_tokens = new Set(input.topic.toLowerCase().split(/\W+/).filter(Boolean));
    const scored = input.candidate_frames.map((f) => {
      const tags = new Set((f.tags ?? []).map((t) => t.toLowerCase()));
      const intersection = [...tags].filter((t) => topic_tokens.has(t)).length;
      const union = new Set([...tags, ...topic_tokens]).size;
      const score = union === 0 ? 0 : intersection / union;
      return { frame_id: f.id, score };
    });
    scored.sort((a, b) => b.score - a.score || a.frame_id.localeCompare(b.frame_id));
    return { kind: "deterministic_fallback", value: { ranking: scored } };
  },

  commit(_output, _ctx): CommitPlan {
    return { versioned: false, writes: [] };
  },
};
