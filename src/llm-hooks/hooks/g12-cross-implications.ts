import type { HookContract, HookContext, CommitPlan, FallbackResult } from "../types";
import { ParseAssertError } from "../types";
import { renderTemplate } from "../prompt-template";
import type { NodeRef, FrameVersion, ArgumentSessionVersion } from "@/schema";

export interface G12Input {
  frame_version: FrameVersion;
  session_state: ArgumentSessionVersion;
  recent_change: {
    kind: "premise_added" | "interpretation_selected" | "checkpoint_answered";
    node_id: NodeRef;
  };
}

export interface G12Output {
  advisories: {
    implicated_node_ids: NodeRef[];
    message: string;
    severity: "info" | "warning";
  }[];
}

export const g12Hook: HookContract<G12Input, G12Output> = {
  id: "G12",
  name: "cross_implications",
  activation: "runtime_sidecar",
  trigger: "automatic",
  mode_visibility: { legal: true, general: { personal: true, academic: true } },

  buildInput(ctx: HookContext): G12Input {
    const session_version: ArgumentSessionVersion = {
      id: "",
      session_id: ctx.session?.id ?? "",
      version_number: 1,
      created_at: new Date(0).toISOString(),
      is_milestone: false,
      premises: ctx.session?.premises ?? [],
      argument_edges: ctx.session?.argument_edges ?? [],
      checkpoint_responses: ctx.session?.checkpoint_responses ?? [],
      interpretation_selections: ctx.session?.interpretation_selections ?? [],
    };
    return {
      frame_version: ctx.frame_version,
      session_state: session_version,
      recent_change: { kind: "premise_added", node_id: (ctx.selection ?? "") as NodeRef },
    };
  },

  renderPrompt(input, prompt) {
    return renderTemplate(prompt.body, input as unknown as Record<string, unknown>);
  },

  parseOutput(_raw, _schema) {
    throw new ParseAssertError("G12.parseOutput: LLM path not active in v1");
  },

  fallback(_input, _error): FallbackResult<G12Output> {
    return { kind: "deterministic_fallback", value: { advisories: [] } };
  },

  commit(_output, _ctx): CommitPlan {
    return { versioned: false, writes: [] };
  },
};
