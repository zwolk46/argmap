import type { HookContract, HookContext, CommitPlan, ParseResult, FallbackResult } from "../types";
import { ParseError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef } from "@/schema";

export interface G2Input {
  term: { id: NodeRef; name: string };
  root_question: { statement: string };
  ancestor_subquestions: { statement: string }[];
  existing_interpretations: { id: NodeRef; statement: string }[];
  frame_mode: "legal" | "general";
  frame_flavor: "personal" | "academic" | null;
  frame_jurisdiction: string | null;
}

export interface G2Output {
  interpretations: {
    statement: string;
    citation_hint?: { authority_label: string; citation_string: string };
    rationale?: string;
  }[];
}

export const g2Hook: HookContract<G2Input, G2Output> = {
  id: "G2",
  name: "interpretation_suggestion",
  activation: "build_time",
  trigger: "manual",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G2Input {
    const fv = ctx.frame_version;
    const term_id = ctx.selection as NodeRef;
    const term_node = fv.nodes.find((n) => n.id === term_id);

    const root = fv.nodes.find((n) => n.type === "RootQuestion");
    const existing = fv.nodes
      .filter(
        (n) =>
          n.type === "Interpretation" &&
          fv.edges.some(
            (e) => e.type === "INTERPRETED_AS" && e.source === term_id && e.target === n.id,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((n) => ({
        id: n.id as NodeRef,
        statement: n.type === "Interpretation" ? n.statement : "",
      }));

    return {
      term: { id: term_id, name: term_node?.type === "Term" ? term_node.name : "" },
      root_question: { statement: root?.type === "RootQuestion" ? root.statement : "" },
      ancestor_subquestions: [],
      existing_interpretations: existing,
      frame_mode: ctx.frame?.mode ?? "general",
      frame_flavor: ctx.frame?.flavor ?? null,
      frame_jurisdiction: ctx.frame?.jurisdiction_default?.region ?? null,
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(raw: string, _schema): ParseResult<G2Output> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { kind: "parse_error", error: new ParseError("not valid JSON", raw), raw };
    }
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.interpretations) || p.interpretations.length === 0) {
      return {
        kind: "parse_error",
        error: new ParseError("interpretations must be a non-empty array", raw),
        raw,
      };
    }
    return {
      kind: "ok",
      value: { interpretations: p.interpretations as G2Output["interpretations"] },
    };
  },

  fallback(_input, error): FallbackResult<G2Output> {
    return { kind: "advise_user", message: error.message };
  },

  commit(output, ctx): CommitPlan {
    const term_id = ctx.selection as NodeRef;
    const is_legal = ctx.frame?.mode === "legal";
    const writes: CommitPlan["writes"] = [];
    for (const interp of output.interpretations) {
      writes.push({
        field_path: "nodes",
        value: { type: "Interpretation", statement: interp.statement },
        op: "create_node",
      });
      writes.push({
        field_path: "edges",
        value: { type: "INTERPRETED_AS", source: term_id },
        op: "create_edge",
      });
      if (is_legal && interp.citation_hint) {
        writes.push({
          field_path: "nodes",
          value: { type: "Authority", label: interp.citation_hint.authority_label },
          op: "create_node",
        });
        writes.push({
          field_path: "edges",
          value: { type: "CITES", citation_string: interp.citation_hint.citation_string },
          op: "create_edge",
        });
      }
    }
    return { versioned: true, writes };
  },
};
