import { createStore } from "zustand/vanilla";
import type {
  ArgumentSession,
  ArgumentSessionVersion,
  FrameId,
  FrameVersionId,
  SessionId,
  SessionVersionId,
} from "@/schema";
import type {
  Repository,
  AutosaveController,
  CrossTabBus,
  ArgumentSessionSummary,
} from "@/persistence";
import type { ComputeResult } from "@/runtime";
import { enumerateOrphanCandidates } from "@/runtime";
import type { OrphanCandidate } from "@/runtime";
import type { OrphanResolution } from "@/persistence";
import type { SessionActionDispatchTable, SessionPatch } from "./action-runner";
import { runSessionAction } from "./action-runner";
import type { ComputeDriver } from "./compute-driver";

export type AiSuggestionStatus = "idle" | "invoking" | "awaiting_decision" | "applying";

export interface SessionStoreSnapshot {
  session: ArgumentSession | null;
  session_version: ArgumentSessionVersion | null;
  compute_result: ComputeResult | null;
  sessions_list: ArgumentSessionSummary[];
  is_loading: boolean;
  error: string | null;
  pending_suggestion: unknown | null;
  suggestion_status: AiSuggestionStatus;
}

interface SessionStoreActions {
  loadSessionsForFrame(frame_id: FrameId): Promise<void>;
  loadSession(session_id: SessionId): Promise<void>;
  applyPatch(patch: SessionPatch): void;
  saveSessionMilestone(change_summary?: string): Promise<void>;
  restoreVersion(ancestor_version_id: SessionVersionId, change_summary?: string): Promise<void>;
  previewMigration(target_frame_version_id: FrameVersionId): Promise<OrphanCandidate[]>;
  migrateToFrameVersion(
    target_frame_version_id: FrameVersionId,
    resolutions: OrphanResolution[],
  ): Promise<void>;
  invokeHook(hook_id: string, args: unknown): Promise<void>;
  resolveSuggestion(decision: unknown): Promise<void>;
  clearPendingSuggestion(): void;
  dispose(): void;
}

type SessionStoreState = SessionStoreSnapshot & SessionStoreActions;

export interface CreateSessionStoreOpts {
  repo: Repository;
  autosave: AutosaveController;
  crosstab: CrossTabBus;
  dispatch: SessionActionDispatchTable;
  compute_driver: ComputeDriver;
  now: () => string;
  generateId: () => string;
  invoke_hook?: (hook_id: string, args: unknown) => Promise<unknown>;
  apply_decision?: (hook_id: string, suggestion: unknown, decision: unknown) => Promise<void>;
}

export function createSessionStore(opts: CreateSessionStoreOpts) {
  const { repo, autosave, dispatch, compute_driver, now, generateId } = opts;

  const store = createStore<SessionStoreState>()((set, get) => ({
    session: null,
    session_version: null,
    compute_result: null,
    sessions_list: [],
    is_loading: false,
    error: null,
    pending_suggestion: null,
    suggestion_status: "idle" as AiSuggestionStatus,

    async loadSessionsForFrame(frame_id: FrameId): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const sessions_list = await repo.listSessionsForFrame(frame_id);
        set({ sessions_list, is_loading: false });
      } catch (e) {
        set({ error: (e as Error).message, is_loading: false });
      }
    },

    async loadSession(session_id: SessionId): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const session = await repo.loadSession(session_id);
        const session_version = await repo.loadSessionVersion(session.current_version_id);
        const computed_at = now();
        const compute_result = compute_driver.runFor(session, computed_at);
        set({ session, session_version, compute_result, is_loading: false });
      } catch (e) {
        set({ error: (e as Error).message, is_loading: false });
      }
    },

    applyPatch(patch: SessionPatch): void {
      const { session, session_version } = get();
      if (!session || !session_version) return;

      const result = runSessionAction({
        session,
        current_version: session_version,
        patch,
        now: now(),
        generateId,
        dispatch,
        compute_driver,
      });

      set({
        session: result.next_session,
        session_version: result.next_version,
        compute_result: result.compute_result,
      });

      autosave.scheduleSessionSave({
        session: result.next_session,
        new_version: result.next_version,
      });
    },

    async saveSessionMilestone(change_summary?: string): Promise<void> {
      const { session, session_version } = get();
      if (!session || !session_version) return;
      await autosave.saveSessionMilestone({
        session,
        new_version: { ...session_version, is_milestone: true, change_summary },
      });
    },

    async restoreVersion(
      ancestor_version_id: SessionVersionId,
      change_summary?: string,
    ): Promise<void> {
      const { session } = get();
      if (!session) return;
      const new_version = await repo.restoreSessionVersion(session.id, ancestor_version_id);
      const stamped: ArgumentSessionVersion =
        change_summary && change_summary.length > 0
          ? { ...new_version, change_summary }
          : new_version;
      if (change_summary && change_summary.length > 0) {
        await repo.saveSessionVersion(stamped);
      }
      const next_session = await repo.loadSession(session.id);
      const computed_at = now();
      const compute_result = compute_driver.runFor(next_session, computed_at);
      set({ session: next_session, session_version: stamped, compute_result });
    },

    async previewMigration(target_frame_version_id: FrameVersionId): Promise<OrphanCandidate[]> {
      const { session, session_version } = get();
      if (!session || !session_version) return [];
      const target_frame_version = await repo.loadFrameVersion(target_frame_version_id);
      return enumerateOrphanCandidates(session_version, target_frame_version);
    },

    async migrateToFrameVersion(
      target_frame_version_id: FrameVersionId,
      resolutions: OrphanResolution[],
    ): Promise<void> {
      const { session } = get();
      if (!session) return;
      const new_version = await repo.migrateSession(
        session.id,
        target_frame_version_id,
        resolutions,
      );
      const next_session = await repo.loadSession(session.id);
      const computed_at = now();
      const compute_result = compute_driver.runFor(next_session, computed_at);
      set({ session: next_session, session_version: new_version, compute_result });
    },

    async invokeHook(hook_id: string, args: unknown): Promise<void> {
      set({ suggestion_status: "invoking" });
      try {
        const result = opts.invoke_hook ? await opts.invoke_hook(hook_id, args) : null;
        set({ pending_suggestion: result, suggestion_status: "awaiting_decision" });
      } catch {
        set({ suggestion_status: "idle" });
      }
    },

    async resolveSuggestion(decision: unknown): Promise<void> {
      set({ suggestion_status: "applying" });
      const { pending_suggestion } = get();
      try {
        if (opts.apply_decision && pending_suggestion) {
          const hook_id = (pending_suggestion as { hook_id?: string }).hook_id ?? "";
          await opts.apply_decision(hook_id, pending_suggestion, decision);
        }
      } finally {
        set({ pending_suggestion: null, suggestion_status: "idle" });
      }
    },

    clearPendingSuggestion(): void {
      set({ pending_suggestion: null, suggestion_status: "idle" });
    },

    dispose(): void {
      // unsubscribes registered at creation time
    },
  }));

  const unsubSaveFailed = autosave.on("save_failed", (e) => {
    if (e.kind === "session") {
      store.setState({ error: e.error?.message ?? "Session save failed" });
    }
  });

  const originalDispose = store.getState().dispose;
  store.setState({
    dispose: () => {
      unsubSaveFailed();
      originalDispose();
    },
  });

  return store;
}

export type SessionStore = ReturnType<typeof createSessionStore>;
