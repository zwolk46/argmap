// Barrel for @/state. Public surface per contracts v2 Contract 7.

// Compute driver
export { createComputeDriver } from "./compute-driver";
export type { ComputeDriver, CreateComputeDriverOpts } from "./compute-driver";

// Action runner — types, dispatch tables, orchestrators
export { runFrameAction, runSessionAction, validateOnly } from "./action-runner";
export type {
  FramePatch,
  SessionPatch,
  FrameTransformResult,
  SessionTransformResult,
  FrameActionDispatchTable,
  SessionActionDispatchTable,
  DispatchOpts,
  ConclusionDirectionResolution,
  CheckpointAnswer,
  RunFrameActionInput,
  FrameActionResult,
  RunSessionActionInput,
  SessionActionResult,
} from "./action-runner";

// Frame store
export { createFrameStore } from "./frame-store";
export type {
  FrameStore,
  FrameStoreSnapshot,
  CreateFrameStoreOpts,
  AiSuggestionStatus,
} from "./frame-store";

// Session store
export { createSessionStore } from "./session-store";
export type { SessionStore, SessionStoreSnapshot, CreateSessionStoreOpts } from "./session-store";

// App state store
export { createAppStateStore } from "./app-state-store";
export type {
  AppStateStore,
  AppStateStoreSnapshot,
  CreateAppStateStoreOpts,
} from "./app-state-store";

// React context + hooks
export {
  RepositoryProvider,
  useRepository,
  useFrameStore,
  useSessionStore,
  useAppStateStore,
} from "./context";
export type { RepositoryProviderValue, RepositoryProviderProps } from "./context";

// Selectors
export {
  selectValidationErrors,
  selectValidationWarnings,
  selectNodeStatus,
  selectOpenGates,
  selectStatusSummary,
  selectCascadeSummary,
  selectPinnedFrames,
  selectFirstLaunchDismissed,
  selectNewFeatureNoticeSeen,
} from "./selectors";
export type { StatusSummary } from "./selectors";
