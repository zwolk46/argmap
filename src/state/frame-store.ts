import { createStore } from "zustand/vanilla";
import type { Frame, FrameVersion, ValidationResult, FrameId } from "@/schema";
import type { Repository, AutosaveController, CrossTabBus } from "@/persistence";
import type { FrameActionDispatchTable, FramePatch } from "./action-runner";
import { runFrameAction, validateOnly } from "./action-runner";
import type { ComputeDriver } from "./compute-driver";

export interface FrameStoreSnapshot {
  frame: Frame | null;
  frame_version: FrameVersion | null;
  validation: ReadonlyArray<ValidationResult>;
  is_loading: boolean;
  error: string | null;
}

interface FrameStoreActions {
  loadFrame(frame_id: FrameId): Promise<void>;
  applyPatch(patch: FramePatch): void;
  saveFrameMilestone(change_summary?: string): Promise<void>;
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
}

export function createFrameStore(opts: CreateFrameStoreOpts) {
  const { repo, autosave, dispatch, compute_driver, now, generateId } = opts;

  const store = createStore<FrameStoreState>()((set, get) => ({
    frame: null,
    frame_version: null,
    validation: [],
    is_loading: false,
    error: null,

    async loadFrame(frame_id: FrameId): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const frame = await repo.loadFrame(frame_id);
        const frame_version = await repo.loadFrameVersion(frame.current_version_id);
        const validation = validateOnly(frame_version, compute_driver);
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

    dispose(): void {
      // unsubscribes are registered below at creation time; no-op here
    },
  }));

  const unsubSaveFailed = autosave.on("save_failed", (e) => {
    if (e.kind === "frame") {
      store.setState({ error: e.error?.message ?? "Frame save failed" });
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

export type FrameStore = ReturnType<typeof createFrameStore>;
