export {
  // Interface + types
  type Repository,
  type FrameSummary,
  type ArgumentSessionSummary,
  type FrameVersionSummary,
  type ArgumentSessionVersionSummary,
  type AppState,
  type FrameSearchHit,
  type OrphanResolution,
  type SaveEvent,
  type AutosaveEvent,
  type AutosaveController,
  type PendingFrameSave,
  type PendingSessionSave,
  type StructuralDiff,
  type SessionStructuralDiff,
  type NodeEditEntry,
  type EdgeEditEntry,
  type MetadataChange,
  type BroadcastEvents,
  type CrossTabBus,
  type Unsubscribe,
  LAYOUT_ONLY_FIELDS,
  QuotaExceededError,
  RepositoryError,
} from "./repository";
export { IndexedDbRepository, type IndexedDbRepositoryOptions } from "./indexeddb-repository";
export {
  createAutosaveController,
  AUTOSAVE_IDLE_MS,
  AUTOSAVE_MAX_MS,
  APP_STATE_DEBOUNCE_MS,
  type AutosaveControllerOptions,
} from "./autosave";
export { diffFrameVersions, diffSessionVersions } from "./diff";
export { buildSearchIndexEntry, tokenize } from "./search-index";
export { createCrossTabBus, BROADCAST_CHANNEL_NAME } from "./broadcast";
