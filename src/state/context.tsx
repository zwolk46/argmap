import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from "react";
import { useStore } from "zustand";
import type { LlmSettings } from "@/schema";
import type { Repository, AutosaveController, CrossTabBus } from "@/persistence";
import { createComputeDriver } from "./compute-driver";
import { createFrameStore } from "./frame-store";
import { createSessionStore } from "./session-store";
import { createAppStateStore } from "./app-state-store";
import type { FrameStore, FrameStoreSnapshot } from "./frame-store";
import type { SessionStore, SessionStoreSnapshot } from "./session-store";
import type { AppStateStore, AppStateStoreSnapshot } from "./app-state-store";
import type { FrameActionDispatchTable, SessionActionDispatchTable } from "./action-runner";

export interface RepositoryProviderValue {
  repository: Repository;
  autosave: AutosaveController;
  crosstab: CrossTabBus;
  frame_store: FrameStore;
  session_store: SessionStore;
  app_state_store: AppStateStore;
  llm_settings_default: LlmSettings;
  now: () => string;
  generateId: () => string;
}

export interface RepositoryProviderProps {
  repo: Repository;
  autosave: AutosaveController;
  crosstab: CrossTabBus;
  frame_dispatch: FrameActionDispatchTable;
  session_dispatch: SessionActionDispatchTable;
  llm_settings_default: LlmSettings;
  now: () => string;
  generateId: () => string;
  children: ReactNode;
}

const RepositoryContext = createContext<RepositoryProviderValue | null>(null);

export function RepositoryProvider(props: RepositoryProviderProps): ReactElement {
  const {
    repo,
    autosave,
    crosstab,
    frame_dispatch,
    session_dispatch,
    llm_settings_default,
    now,
    generateId,
    children,
  } = props;

  const compute_driver = useMemo(() => createComputeDriver({ now }), [now]);

  const frame_store = useMemo(
    () =>
      createFrameStore({
        repo,
        autosave,
        crosstab,
        dispatch: frame_dispatch,
        compute_driver,
        now,
        generateId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const session_store = useMemo(
    () =>
      createSessionStore({
        repo,
        autosave,
        crosstab,
        dispatch: session_dispatch,
        compute_driver,
        now,
        generateId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const app_state_store = useMemo(
    () =>
      createAppStateStore({
        repo,
        autosave,
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const value = useMemo<RepositoryProviderValue>(
    () => ({
      repository: repo,
      autosave,
      crosstab,
      frame_store,
      session_store,
      app_state_store,
      llm_settings_default,
      now,
      generateId,
    }),
    [
      repo,
      autosave,
      crosstab,
      frame_store,
      session_store,
      app_state_store,
      llm_settings_default,
      now,
      generateId,
    ],
  );

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): RepositoryProviderValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useRepository must be used inside <RepositoryProvider>");
  }
  return ctx;
}

export function useFrameStore(): FrameStoreSnapshot;
export function useFrameStore<T>(selector: (s: FrameStoreSnapshot) => T): T;
export function useFrameStore<T>(selector?: (s: FrameStoreSnapshot) => T): FrameStoreSnapshot | T {
  const { frame_store } = useRepository();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(frame_store, (selector ?? ((s: any) => s)) as any) as FrameStoreSnapshot | T;
}

export function useSessionStore(): SessionStoreSnapshot;
export function useSessionStore<T>(selector: (s: SessionStoreSnapshot) => T): T;
export function useSessionStore<T>(
  selector?: (s: SessionStoreSnapshot) => T,
): SessionStoreSnapshot | T {
  const { session_store } = useRepository();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(session_store, (selector ?? ((s: any) => s)) as any) as SessionStoreSnapshot | T;
}

export function useAppStateStore(): AppStateStoreSnapshot;
export function useAppStateStore<T>(selector: (s: AppStateStoreSnapshot) => T): T;
export function useAppStateStore<T>(
  selector?: (s: AppStateStoreSnapshot) => T,
): AppStateStoreSnapshot | T {
  const { app_state_store } = useRepository();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(app_state_store, (selector ?? ((s: any) => s)) as any) as
    | AppStateStoreSnapshot
    | T;
}
