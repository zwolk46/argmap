import { createStore } from "zustand/vanilla";
import type { Frame, FrameVersion, FrameId, SessionId, Mode, Flavor } from "@/schema";
import type { Repository, AutosaveController, AppState, FrameSummary } from "@/persistence";

export interface AppStateStoreSnapshot {
  app_state: AppState;
  frames: FrameSummary[];
  is_loading: boolean;
  /**
   * True after the first call to loadAppState has resolved (either with
   * persisted state or with a fresh-default seed). UI surfaces that mutate
   * AppState should gate on this flag so the first paint never autosaves
   * DEFAULT_APP_STATE over the user's real on-disk state. P0-1.
   */
  is_loaded: boolean;
  error: string | null;
}

interface AppStateStoreActions {
  loadAppState(): Promise<void>;
  loadFrames(): Promise<void>;
  createFrame(opts: {
    title: string;
    mode?: Mode;
    flavor?: Flavor;
  }): Promise<{ frame: Frame; version: FrameVersion }>;
  deleteFrame(frame_id: FrameId): Promise<void>;
  deleteSession(session_id: SessionId): Promise<void>;
  pinFrame(frame_id: FrameId, pinned: boolean): void;
  setRecent(frame_id: FrameId): void;
  dismissWarning(warning_id: string): void;
  undismissWarning(warning_id: string): void;
  resetCoachmarks(): void;
  dismissCoachmark(coachmark_id: string, dismissed?: boolean): void;
  markNewFeatureNoticeSeen(feature_id: string): void;
  setOutputViewTabChoice(frame_id: FrameId, tab: string): void;
  dispose(): void;
}

type AppStateStoreState = AppStateStoreSnapshot & AppStateStoreActions;

const DEFAULT_APP_STATE: AppState = {
  recents: [],
  pinned: [],
  default_output_view: "path_overlay",
  side_panel_collapsed: {},
  coachmark_dismissals: {},
  last_known_schema_version: 1,
};

export interface CreateAppStateStoreOpts {
  repo: Repository;
  autosave: AutosaveController;
  now: () => string;
}

export function createAppStateStore(opts: CreateAppStateStoreOpts) {
  const { repo, autosave } = opts;

  function scheduleAppStateSave(state: AppState): void {
    autosave.scheduleAppStateSave(state);
  }

  const store = createStore<AppStateStoreState>()((set, get) => ({
    app_state: DEFAULT_APP_STATE,
    frames: [],
    is_loading: false,
    is_loaded: false,
    error: null,

    async loadAppState(): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const app_state = await repo.loadAppState();
        set({ app_state, is_loading: false, is_loaded: true });
      } catch (e) {
        const msg = (e as Error).message;
        // First-launch users have no AppState singleton. The repository throws
        // a RepositoryError with "AppState singleton missing"; seed defaults
        // and persist them so subsequent boots take the fast path.
        if (typeof msg === "string" && msg.includes("AppState singleton missing")) {
          try {
            await repo.saveAppState(DEFAULT_APP_STATE);
          } catch (saveErr) {
            // If the seed save fails (e.g., quota), still mark loaded so the
            // UI is interactive; subsequent saves will surface the real error.
            void saveErr;
          }
          set({ app_state: DEFAULT_APP_STATE, is_loading: false, is_loaded: true });
          return;
        }
        set({ error: msg, is_loading: false, is_loaded: true });
      }
    },

    async loadFrames(): Promise<void> {
      set({ is_loading: true, error: null });
      try {
        const frames = await repo.listFrames();
        set({ frames, is_loading: false });
      } catch (e) {
        set({ error: (e as Error).message, is_loading: false });
      }
    },

    async createFrame(createOpts: {
      title: string;
      mode?: Mode;
      flavor?: Flavor;
    }): Promise<{ frame: Frame; version: FrameVersion }> {
      const result = await repo.createBlankFrame(createOpts);
      const frames = await repo.listFrames();
      set({ frames });
      return result;
    },

    async deleteFrame(frame_id: FrameId): Promise<void> {
      await repo.deleteFrame(frame_id);
      const frames = await repo.listFrames();
      const { app_state } = get();
      const next_state: AppState = {
        ...app_state,
        recents: app_state.recents.filter((id) => id !== frame_id),
        pinned: app_state.pinned.filter((id) => id !== frame_id),
      };
      set({ frames, app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    async deleteSession(session_id: SessionId): Promise<void> {
      await repo.deleteSession(session_id);
    },

    pinFrame(frame_id: FrameId, pinned: boolean): void {
      const { app_state } = get();
      const existing_pinned = app_state.pinned;
      const next_pinned = pinned
        ? existing_pinned.includes(frame_id)
          ? existing_pinned
          : [...existing_pinned, frame_id]
        : existing_pinned.filter((id) => id !== frame_id);
      const next_state: AppState = { ...app_state, pinned: next_pinned };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    setRecent(frame_id: FrameId): void {
      const { app_state } = get();
      const filtered = app_state.recents.filter((id) => id !== frame_id);
      const next_state: AppState = {
        ...app_state,
        recents: [frame_id, ...filtered].slice(0, 20),
      };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    dismissWarning(warning_id: string): void {
      const { app_state } = get();
      const next_state: AppState = {
        ...app_state,
        dismissed_warnings: { ...(app_state.dismissed_warnings ?? {}), [warning_id]: true },
      };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    undismissWarning(warning_id: string): void {
      const { app_state } = get();
      const { [warning_id]: _removed, ...rest } = app_state.dismissed_warnings ?? {};
      const next_state: AppState = { ...app_state, dismissed_warnings: rest };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    resetCoachmarks(): void {
      const { app_state } = get();
      const next_state: AppState = { ...app_state, coachmark_dismissals: {} };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    dismissCoachmark(coachmark_id: string, dismissed: boolean = true): void {
      const { app_state } = get();
      const next_state: AppState = {
        ...app_state,
        coachmark_dismissals: {
          ...app_state.coachmark_dismissals,
          [coachmark_id]: dismissed,
        },
      };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    markNewFeatureNoticeSeen(feature_id: string): void {
      const { app_state } = get();
      const next_state: AppState = {
        ...app_state,
        seen_new_feature_notices: {
          ...(app_state.seen_new_feature_notices ?? {}),
          [feature_id]: true,
        },
      };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    setOutputViewTabChoice(frame_id: FrameId, tab: string): void {
      const { app_state } = get();
      const next_state: AppState = {
        ...app_state,
        output_view_tab_choice_by_frame: {
          ...(app_state.output_view_tab_choice_by_frame ?? {}),
          [frame_id]: tab,
        },
      };
      set({ app_state: next_state });
      scheduleAppStateSave(next_state);
    },

    dispose(): void {
      // no subscriptions to clean up at the moment
    },
  }));

  return store;
}

export type AppStateStore = ReturnType<typeof createAppStateStore>;
