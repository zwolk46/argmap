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
  selectNodeStatusCounts,
  selectStatusSummary,
  selectInterviewItems,
  selectFrameVersionDrift,
  selectOutputForView,
  selectStatusBadge,
  selectCascadeSummary,
  selectValidationByNode,
  selectValidationByEdge,
  selectValidationDrawer,
  selectFrameCanCommitTransition,
  selectPinnedFrames,
  selectFirstLaunchDismissed,
  selectNewFeatureNoticeSeen,
} from "./selectors";
export type {
  NodeStatusCounts,
  StatusSummary,
  SessionShape,
  FrameVersionDriftSummary,
  OutputViewTab,
  OutputViewPayload,
  StatusBadgeData,
  ValidationDrawerEntry,
} from "./selectors";

// Re-exported for I.9b cascade UI (Contract 8 boundary: @/state is the value-import path)
export type { CascadeReport } from "@/runtime";

// Re-exported for I.9c argument-running UI per F-022 (state is the broker).
export type { InterviewItem } from "@/modes";
