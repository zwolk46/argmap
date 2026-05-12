import type { HookContract, HookContext, CommitPlan, FallbackResult } from "../types";
import type { ParseResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { StructuralDiff } from "@/persistence";

export interface G13Input {
  diff: StructuralDiff;
  parent_version_change_summary?: string;
  frame_mode: "legal" | "general";
}

export interface G13Output {
  change_summary: string;
}

export const g13Hook: HookContract<G13Input, G13Output> = {
  id: "G13",
  name: "version_change_summary",
  activation: "build_time",
  trigger: "automatic",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G13Input {
    return {
      diff: {
        nodes: { added: [], removed: [], edited: [] },
        edges: { added: [], removed: [], edited: [] },
        metadata: { changed_fields: [] },
        layout_only: false,
        layout_changed_count: 0,
      },
      parent_version_change_summary: undefined,
      frame_mode: ctx.frame?.mode ?? "general",
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G13Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (typeof p.change_summary !== "string" || p.change_summary.trim().length === 0) {
      return {
        kind: "parse_error",
        error: new ParseError("change_summary must be a non-empty string", raw),
        raw,
      };
    }
    const wordCount = p.change_summary.trim().split(/\s+/).length;
    if (wordCount >= 30) {
      return {
        kind: "parse_error",
        error: new ParseError("change_summary must be under 30 words", raw),
        raw,
      };
    }
    return { kind: "ok", value: { change_summary: p.change_summary } };
  },

  fallback(input): FallbackResult<G13Output> {
    const d = input.diff;
    const parts: string[] = [];
    if (d.nodes.added.length)
      parts.push(`added ${d.nodes.added.length} node${d.nodes.added.length === 1 ? "" : "s"}`);
    if (d.nodes.removed.length)
      parts.push(
        `removed ${d.nodes.removed.length} node${d.nodes.removed.length === 1 ? "" : "s"}`,
      );
    if (d.edges.added.length)
      parts.push(`added ${d.edges.added.length} edge${d.edges.added.length === 1 ? "" : "s"}`);
    if (d.edges.removed.length)
      parts.push(
        `removed ${d.edges.removed.length} edge${d.edges.removed.length === 1 ? "" : "s"}`,
      );
    const summary = parts.length ? parts.join(", ") + "." : "Minor edits.";
    return { kind: "deterministic_fallback", value: { change_summary: summary } };
  },

  commit(output): CommitPlan {
    return {
      versioned: true,
      writes: [{ field_path: "change_summary", value: output.change_summary, op: "set" }],
    };
  },
};
