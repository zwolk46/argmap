import * as React from "react";
import type { HookId, SuggestionResult, ConfirmationDecision, CommitPlan } from "@/llm-hooks";
import type { LlmSettings } from "@/schema";
import { useFrameStore, useSessionStore, useRepository } from "@/state";

// F-05 (session half): the LlmSettings gate lives on Frame; session-store is
// deliberately decoupled from frame-store. Both stores are in scope here, so
// the gate is applied at this layer for session-store hooks. UI layer cannot
// value-import @/llm-hooks (see eslint.config), so we apply group gates
// coarsely: session-store hosts runtime + output-time hooks, so either group
// flag opens the gate. The per_hook map is the precise override.
function checkSessionHookGate(
  hook_id: string,
  llm_settings: LlmSettings | undefined,
): { allowed: true } | { allowed: false; reason: string } {
  if (!llm_settings) return { allowed: true };
  const per_hook = llm_settings.per_hook_enabled?.[hook_id];
  if (per_hook === false) {
    return { allowed: false, reason: `${hook_id} is disabled in Frame Settings.` };
  }
  if (per_hook === true) return { allowed: true };
  const runtime_on = llm_settings.runtime_hooks_enabled !== false;
  const output_on = llm_settings.output_time_hooks_enabled !== false;
  if (!runtime_on && !output_on) {
    return {
      allowed: false,
      reason: "Runtime and output-time AI hooks are disabled in Frame Settings.",
    };
  }
  return { allowed: true };
}

export type AiSuggestionStatus = "idle" | "invoking" | "awaiting_decision" | "applying";

export interface UseAiSuggestionReturn<TOut> {
  pending: SuggestionResult<TOut> | null;
  status: AiSuggestionStatus;
  /**
   * Whether the AI hook surface is wired through to an executor. When
   * false (the production state today — no backend hook handlers
   * configured in context.tsx), invoke() will resolve without producing
   * a suggestion, so call sites should hide the affordance entirely
   * rather than render a button that does nothing visible.
   */
  enabled: boolean;
  invoke: (hook_id: HookId, args: unknown) => Promise<void>;
  resolve: (decision: ConfirmationDecision<TOut>) => Promise<void>;
  dismiss: () => Promise<void>;
  /**
   * §12 F-18: synchronous preview of the CommitPlan that resolve(decision) would
   * produce. Returns null when no plan can be computed (no pending suggestion,
   * no preview wired, or hook.commit threw). Drawer renders the plan above the
   * Reject/Edit/Accept buttons so users see what they're signing off on.
   */
  previewCommit: (decision: ConfirmationDecision<TOut>) => CommitPlan | null;
}

export function useAiSuggestion<TOut>(
  store_kind: "frame" | "session",
): UseAiSuggestionReturn<TOut> {
  const frame_pending = useFrameStore((s) => s.pending_suggestion);
  const frame_status = useFrameStore((s) => s.suggestion_status);

  const session_pending = useSessionStore((s) => s.pending_suggestion);
  const session_status = useSessionStore((s) => s.suggestion_status);

  const { frame_store, session_store, ai_hooks_enabled } = useRepository();

  const pending = (
    store_kind === "frame" ? frame_pending : session_pending
  ) as SuggestionResult<TOut> | null;
  const status: AiSuggestionStatus = (
    store_kind === "frame" ? frame_status : session_status
  ) as AiSuggestionStatus;

  const invoke = React.useCallback(
    async (hook_id: HookId, args: unknown) => {
      if (store_kind === "frame") {
        await frame_store.getState().invokeHook(hook_id as string, args);
      } else {
        const llm_settings = frame_store.getState().frame?.llm_settings;
        const gate = checkSessionHookGate(hook_id as string, llm_settings);
        if (!gate.allowed) {
          session_store.getState().rejectSuggestion(gate.reason);
          return;
        }
        await session_store.getState().invokeHook(hook_id as string, args);
      }
    },
    [store_kind, frame_store, session_store],
  );

  const resolve = React.useCallback(
    async (decision: ConfirmationDecision<TOut>) => {
      if (store_kind === "frame") {
        await frame_store.getState().resolveSuggestion(decision);
      } else {
        await session_store.getState().resolveSuggestion(decision);
      }
    },
    [store_kind, frame_store, session_store],
  );

  const dismiss = React.useCallback(async () => {
    await resolve({ kind: "rejected" } as ConfirmationDecision<TOut>);
  }, [resolve]);

  const previewCommit = React.useCallback(
    (decision: ConfirmationDecision<TOut>): CommitPlan | null => {
      const store = store_kind === "frame" ? frame_store : session_store;
      const plan = store.getState().previewCommit(decision);
      return (plan as CommitPlan | null) ?? null;
    },
    [store_kind, frame_store, session_store],
  );

  return { pending, status, enabled: ai_hooks_enabled, invoke, resolve, dismiss, previewCommit };
}
