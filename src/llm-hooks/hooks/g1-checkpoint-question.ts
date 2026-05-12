import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import { sortedIter } from "@/runtime/iteration-helpers";
import type { NodeRef } from "@/schema";

export interface G1Input {
  parent_subquestion: { id: NodeRef; statement: string };
  sibling_checkpoints: { id: NodeRef; question: string }[];
  has_siblings: boolean;
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
  frame_jurisdiction: string | null;
}

export interface G1Output {
  question: string;
  options: { label: string; target_hint: NodeRef | null }[];
}

export const g1Hook: HookContract<G1Input, G1Output> = {
  id: "G1",
  name: "checkpoint_question_generation",
  activation: "build_time",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G1Input {
    const fv = ctx.frame_version;
    const checkpoint_id = ctx.selection as NodeRef;

    // Walk DECOMPOSES_INTO edges upward to find the parent SubQuestion
    const parent_edge = sortedIter(
      new Set(fv.edges.filter((e) => e.type === "DECOMPOSES_INTO" && e.target === checkpoint_id)),
      (e) => e.id,
    )[0];
    const parent_node = parent_edge ? fv.nodes.find((n) => n.id === parent_edge.source) : undefined;

    const parent_sq = parent_node && parent_node.type === "SubQuestion" ? parent_node : undefined;

    const sibling_checkpoints = sortedIter(
      new Set(
        fv.nodes.filter((n) => {
          if (n.id === checkpoint_id || n.type !== "Checkpoint") return false;
          return fv.edges.some(
            (e) =>
              e.type === "DECOMPOSES_INTO" &&
              e.source === (parent_sq?.id ?? "") &&
              e.target === n.id,
          );
        }),
      ),
      (n) => n.id,
    ).map((n) => ({ id: n.id as NodeRef, question: n.type === "Checkpoint" ? n.question : "" }));

    return {
      parent_subquestion: {
        id: (parent_sq?.id ?? "") as NodeRef,
        statement: parent_sq?.statement ?? "",
      },
      sibling_checkpoints,
      has_siblings: sibling_checkpoints.length > 0,
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
      frame_jurisdiction: ctx.frame?.jurisdiction_default?.region ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G1Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("Response is not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.question !== "string" || p.question.trim().length === 0) {
      return {
        kind: "parse_error",
        error: new ParseError("question must be a non-empty string", raw),
        raw,
      };
    }
    if (/\band\b|\bplus\b/i.test(p.question)) {
      return {
        kind: "parse_error",
        error: new ParseError(
          'question must ask exactly ONE thing (contains "and" or "plus")',
          raw,
        ),
        raw,
      };
    }
    if (!Array.isArray(p.options) || p.options.length < 2 || p.options.length > 6) {
      return {
        kind: "parse_error",
        error: new ParseError("options must be an array of 2–6 items", raw),
        raw,
      };
    }
    const options = (p.options as unknown[]).map((o) => {
      const opt = o as Record<string, unknown>;
      return {
        label: String(opt.label ?? ""),
        target_hint: (opt.target_hint as NodeRef | null) ?? null,
      };
    });
    return { kind: "ok", value: { question: p.question, options } };
  },

  fallback(_input, error): FallbackResult<G1Output> {
    return { kind: "advise_user", message: `AI suggestion was malformed: ${error.message}` };
  },

  commit(output, ctx): CommitPlan {
    const checkpoint_id = ctx.selection as NodeRef;
    return {
      versioned: true,
      writes: [
        {
          target_node_id: checkpoint_id,
          field_path: "question",
          value: output.question,
          op: "set",
        },
        {
          target_node_id: checkpoint_id,
          field_path: "options",
          value: output.options.map((o) => ({
            label: o.label,
            target_node_id: o.target_hint,
          })),
          op: "set",
        },
      ],
    };
  },
};
