import type {
  HookInvocationRecord,
  SuggestionResult,
  ConfirmationDecision,
  CommitPlan,
  LlmHooksDeps,
} from "./types";
import type { NodeRef } from "@/schema";
import { sortedKeys } from "@/runtime/iteration-helpers";

export type ProvenanceDeps = LlmHooksDeps;

export function canonicalize(input: unknown): string {
  return JSON.stringify(input, function (_key: string, value: unknown) {
    if (value === undefined) return undefined;
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonicalize: non-finite numbers are not allowed");
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const k of sortedKeys(obj)) sorted[k] = obj[k];
      return sorted;
    }
    return value;
  });
}

export async function hashCanonical(canonical: string, deps: ProvenanceDeps = {}): Promise<string> {
  const subtle = deps.cryptoSubtle ?? globalThis.crypto.subtle;
  const bytes = new TextEncoder().encode(canonical);
  const buf = await subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export interface BuildInvocationArgs {
  suggestion: SuggestionResult<unknown>;
  decision: ConfirmationDecision<unknown>;
  commit_plan: CommitPlan;
  committed: boolean;
}

export function buildInvocationRecord(
  args: BuildInvocationArgs,
  deps: ProvenanceDeps = {},
): HookInvocationRecord {
  const now = deps.now ? deps.now() : new Date().toISOString();
  const id = deps.generateId ? deps.generateId() : globalThis.crypto.randomUUID();

  const { suggestion, decision, commit_plan, committed } = args;
  const target_node_ids: NodeRef[] = [];
  const target_field_paths: string[] = [];
  for (const write of commit_plan.writes) {
    if (write.target_node_id) target_node_ids.push(write.target_node_id);
    target_field_paths.push(
      (write.target_node_id ? `${write.target_node_id}:` : "") + write.field_path,
    );
  }
  target_node_ids.sort();
  target_field_paths.sort();

  const decision_kind = decision.kind;
  const final_value = decision_kind === "rejected" ? undefined : decision.final;
  return {
    id,
    hook_id: suggestion.hook_id,
    prompt_name: suggestion.prompt_name,
    prompt_version: suggestion.prompt_version,
    provider_id: suggestion.provider_id,
    model_id: suggestion.model_id,
    input_hash: suggestion.input_hash,
    raw_response: suggestion.raw_response,
    decision: decision_kind,
    final_value,
    target_node_ids: target_node_ids.length ? target_node_ids : undefined,
    target_field_paths: target_field_paths.length ? target_field_paths : undefined,
    invoked_at: suggestion.generated_at,
    committed_at: committed && decision_kind !== "rejected" ? now : undefined,
  };
}
