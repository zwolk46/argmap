import { createStore } from "zustand/vanilla";
import type { Frame, FrameVersion, ValidationResult, FrameId, FrameVersionId } from "@/schema";
import type { Repository, AutosaveController, CrossTabBus } from "@/persistence";
import type { FrameActionDispatchTable, FramePatch } from "./action-runner";
import { runFrameAction, validateOnly } from "./action-runner";
import type { ComputeDriver } from "./compute-driver";

export type AiSuggestionStatus = "idle" | "invoking" | "awaiting_decision" | "applying";

export interface FrameStoreSnapshot {
  frame: Frame | null;
  frame_version: FrameVersion | null;
  validation: ReadonlyArray<ValidationResult>;
  is_loading: boolean;
  error: string | null;
  pending_suggestion: unknown | null;
  suggestion_status: AiSuggestionStatus;
}

interface FrameStoreActions {
  loadFrame(frame_id: FrameId): Promise<void>;
  applyPatch(patch: FramePatch): void;
  saveFrameMilestone(change_summary?: string): Promise<void>;
  restoreVersion(ancestor_version_id: FrameVersionId, change_summary?: string): Promise<void>;
  invokeHook(hook_id: string, args: unknown): Promise<void>;
  resolveSuggestion(decision: unknown): Promise<void>;
  clearPendingSuggestion(): void;
  dispose(): void;
}

type FrameStoreState = FrameStoreSnapshot & FrameStoreActions;

export interface CreateFrameStoreOpts {
  repo: Repository;
  autosave: AutosaveController;
  crosstab: CrossTabBus;
  dispatch: FrameActionDispatchTable;
  compute_driver: ComputeDriver;
  now: () => string;
  generateId: () => string;
  invoke_hook?: (hook_id: string, args: unknown) => Promise<unknown>;
  apply_decision?: (hook_id: string, suggestion: unknown, decision: unknown) => Promise<void>;
}

export function createFrameStore(opts: CreateFrameStoreOpts) {
  const { repo, autosave, crosstab, dispatch, compute_driver, now, generateId } = opts;

  const store = createStore<FrameStoreState>()((set, get) => ({
    frame: null,
    frame_version: null,
    validation: [],
    is_loading: false,
    error: null,
    pending_suggestion: null,
    suggestion_status: "idle" as AiSuggestionStatus,

    async loadFrame(frame_id: FrameId): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const frame = await repo.loadFrame(frame_id);
        const frame_version = await repo.loadFrameVersion(frame.current_version_id);
        // §15 F-11: pass `frame` so V-FR-10 picks up Conclusions whose
        // position_id no longer resolves on the current Frame.
        const validation = validateOnly(frame_version, compute_driver, frame);
        set({ frame, frame_version, validation, is_loading: false });
      } catch (e) {
        set({ error: (e as Error).message, is_loading: false });
      }
    },

    applyPatch(patch: FramePatch): void {
      const { frame, frame_version } = get();
      if (!frame || !frame_version) return;

      const result = runFrameAction({
        frame,
        current_version: frame_version,
        patch,
        now: now(),
        generateId,
        dispatch,
        compute_driver,
      });

      set({
        frame: result.next_frame,
        frame_version: result.next_version,
        validation: result.validation,
      });

      autosave.scheduleFrameSave({
        frame: result.next_frame,
        new_version: result.next_version,
        change_summary: result.change_summary,
      });
    },

    async saveFrameMilestone(change_summary?: string): Promise<void> {
      const { frame, frame_version } = get();
      if (!frame || !frame_version) return;
      await autosave.saveFrameMilestone({
        frame,
        new_version: { ...frame_version, is_milestone: true, change_summary },
      });
    },

    async restoreVersion(
      ancestor_version_id: FrameVersionId,
      change_summary?: string,
    ): Promise<void> {
      const { frame } = get();
      if (!frame) return;
      // P1: pass change_summary directly into the repo call. Before this,
      // a custom summary forced a second saveFrameVersion that re-walked
      // the transaction and produced a brief render with the default
      // "Restored from version N" copy visible in the version-history pane.
      const new_version = await repo.restoreFrameVersion(
        frame.id,
        ancestor_version_id,
        change_summary && change_summary.length > 0 ? change_summary : undefined,
      );
      const next_frame: Frame = { ...frame, current_version_id: new_version.id };
      // §15 F-11: pair the restored version with the live Frame so an older
      // version referencing a Position the user has since deleted surfaces.
      const validation = validateOnly(new_version, compute_driver, next_frame);
      set({ frame: next_frame, frame_version: new_version, validation });
    },

    async invokeHook(hook_id: string, args: unknown): Promise<void> {
      // F-05: respect the per-frame LlmSettings gates. build-time / runtime
      // / output-time hook groups, plus the per-hook enable map, are written
      // to disk; without this gate the toggles existed but were inert.
      const llm = get().frame?.llm_settings;
      if (llm) {
        const per_hook = llm.per_hook_enabled?.[hook_id];
        if (per_hook === false) {
          set({ error: `${hook_id} is disabled in Frame Settings.`, suggestion_status: "idle" });
          return;
        }
        // Frame-store hooks run at build time on the frame.
        if (per_hook !== true && llm.build_time_hooks_enabled === false) {
          set({
            error: "Build-time AI hooks are disabled in Frame Settings.",
            suggestion_status: "idle",
          });
          return;
        }
      }
      set({ suggestion_status: "invoking" });
      try {
        const result = opts.invoke_hook ? await opts.invoke_hook(hook_id, args) : null;
        set({ pending_suggestion: result, suggestion_status: "awaiting_decision" });
      } catch (e) {
        // Surface the failure to the store's error field so the toast
        // bridge can render it; previously this catch was bare and the
        // user saw the button flicker and produce nothing with no
        // explanation. Status returns to idle so the call site can retry.
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
      // unsubscribes are registered below at creation time; no-op here
    },
  }));

  const unsubSaveFailed = autosave.on("save_failed", (e) => {
    if (e.kind === "frame") {
      store.setState({ error: e.error?.message ?? "Frame save failed" });
    }
  });

  // P0-2: when a peer tab saves the SAME frame we're viewing, refresh our
  // snapshot from disk so we don't render a stale version. BroadcastChannel
  // doesn't self-deliver, so this never fires for our own saves.
  const unsubFrameSaved = crosstab.subscribe("frame_saved", ({ frame_id, version_id }) => {
    const { frame, frame_version } = store.getState();
    if (!frame || frame.id !== frame_id) return;
    // Already at this version (or newer) — skip the round-trip.
    if (frame_version && frame_version.id === version_id) return;
    void store.getState().loadFrame(frame_id);
  });

  // P0-5: when a peer tab deletes the frame we're viewing, drop our
  // in-memory snapshot so the UI no longer renders a deleted entity.
  const unsubFrameDeleted = crosstab.subscribe("frame_deleted", ({ frame_id }) => {
    const { frame } = store.getState();
    if (!frame || frame.id !== frame_id) return;
    store.setState({
      frame: null,
      frame_version: null,
      validation: [],
      error: "This frame was deleted in another tab.",
    });
  });

  const originalDispose = store.getState().dispose;
  store.setState({
    dispose: () => {
      unsubSaveFailed();
      unsubFrameSaved();
      unsubFrameDeleted();
      originalDispose();
    },
  });

  return store;
}

export type FrameStore = ReturnType<typeof createFrameStore>;
