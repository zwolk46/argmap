import * as React from "react";
import type { HookId, SuggestionResult, ConfirmationDecision } from "@/llm-hooks";
import { useFrameStore, useSessionStore, useRepository } from "@/state";

export type AiSuggestionStatus = "idle" | "invoking" | "awaiting_decision" | "applying";

export interface UseAiSuggestionReturn<TOut> {
  pending: SuggestionResult<TOut> | null;
  status: AiSuggestionStatus;
  invoke: (hook_id: HookId, args: unknown) => Promise<void>;
  resolve: (decision: ConfirmationDecision<TOut>) => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useAiSuggestion<TOut>(
  store_kind: "frame" | "session",
): UseAiSuggestionReturn<TOut> {
  const frame_pending = useFrameStore((s) => s.pending_suggestion);
  const frame_status = useFrameStore((s) => s.suggestion_status);

  const session_pending = useSessionStore((s) => s.pending_suggestion);
  const session_status = useSessionStore((s) => s.suggestion_status);

  const { frame_store, session_store } = useRepository();

  const pending = (store_kind === "frame" ? frame_pending : session_pending) as SuggestionResult<TOut> | null;
  const status: AiSuggestionStatus =
    (store_kind === "frame" ? frame_status : session_status) as AiSuggestionStatus;

  const invoke = React.useCallback(
    async (hook_id: HookId, args: unknown) => {
      if (store_kind === "frame") {
        await frame_store.getState().invokeHook(hook_id as string, args);
      } else {
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

  return { pending, status, invoke, resolve, dismiss };
}
