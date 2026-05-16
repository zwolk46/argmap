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
  const { repo, autosave, crosstab, dispatch, compute_driver, now, generateId } = opts;

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
      // P1: pass change_summary directly so the repo stamps it inside the
      // restore transaction; no second saveSessionVersion call needed.
      const new_version = await repo.restoreSessionVersion(
        session.id,
        ancestor_version_id,
        change_summary && change_summary.length > 0 ? change_summary : undefined,
      );
      const next_session = await repo.loadSession(session.id);
      const computed_at = now();
      const compute_result = compute_driver.runFor(next_session, computed_at);
      set({ session: next_session, session_version: new_version, compute_result });
    },

    async previewMigration(target_frame_version_id: FrameVersionId): Promise<OrphanCandidate[]> {
      const { session, session_version } = get();
      if (!session || !session_version) return [];
      const target_frame_version = await repo.loadFrameVersion(target_frame_version_id);
      // P0-25: pass the session's prior frame snapshot so the reattach
      // heuristic in runtime/extras.ts can populate reattach_candidates.
      return enumerateOrphanCandidates(
        session_version,
        target_frame_version,
        session.frame_version_snapshot,
      );
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
      // F-05: respect per-frame LlmSettings — session-store hooks run at
      // runtime / output-time against premises. Both gates apply; the
      // per_hook map overrides the group gate when explicit.
      const llm = get().session?.frame_version_snapshot?.llm_settings_snapshot
        ? undefined // F-028 snapshot path doesn't carry the full gate map yet; fall through to frame.
        : undefined;
      // Real LlmSettings live on Frame; the session-store can't reach the
      // frame_store directly without a coupling. Use the optional invoke_hook
      // contract — callers (e.g., useAiSuggestion) that DO want the gate
      // enforced pass null/skip when disabled. We still check the snapshot's
      // own LlmSettings if it grows to carry them.
      void llm;
      set({ suggestion_status: "invoking" });
      try {
        const result = opts.invoke_hook ? await opts.invoke_hook(hook_id, args) : null;
        set({ pending_suggestion: result, suggestion_status: "awaiting_decision" });
      } catch (e) {
        // Surface the failure so the toast bridge can render it; bare
        // catch left the user with a silent flicker.
        const message = e instanceof Error ? e.message : "AI suggestion failed";
        set({ suggestion_status: "idle", error: message });
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

  // P0-2: refresh on peer-tab session_saved for the OPEN session id.
  const unsubSessionSaved = crosstab.subscribe("session_saved", ({ session_id, version_id }) => {
    const { session, session_version } = store.getState();
    if (!session || session.id !== session_id) return;
    if (session_version && session_version.id === version_id) return;
    void store.getState().loadSession(session_id);
  });

  // P0-2: if a peer deletes the session we're viewing, drop our snapshot.
  const unsubSessionDeleted = crosstab.subscribe("session_deleted", ({ session_id }) => {
    const { session } = store.getState();
    if (!session || session.id !== session_id) return;
    store.setState({
      session: null,
      session_version: null,
      compute_result: null,
      error: "This session was deleted in another tab.",
    });
  });

  // P0-2: if a peer deletes the parent FRAME of our open session, the
  // session is unreachable too — drop in-memory state.
  const unsubFrameDeletedForSession = crosstab.subscribe("frame_deleted", ({ frame_id }) => {
    const { session } = store.getState();
    if (!session || session.frame_id !== frame_id) return;
    store.setState({
      session: null,
      session_version: null,
      compute_result: null,
      error: "The parent frame was deleted in another tab.",
    });
  });

  const originalDispose = store.getState().dispose;
  store.setState({
    dispose: () => {
      unsubSaveFailed();
      unsubSessionSaved();
      unsubSessionDeleted();
      unsubFrameDeletedForSession();
      originalDispose();
    },
  });

  return store;
}

export type SessionStore = ReturnType<typeof createSessionStore>;
