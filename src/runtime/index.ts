// Barrel for @/runtime. Public surface only.
//
// `compute` is the single cross-module entry point. The iteration helpers are
// re-exported for tests; downstream application modules generally route
// through `compute` and the persisted types from @/schema.

export { compute } from "./compute";
export type { ComputeInput, ComputeResult } from "./compute";

export { sortedIter, sortedKeys, sortedEntries, sortedBy } from "./iteration-helpers";

export type { BindingResult, BindingSource, BindingCertainty } from "./authority-binding";
export { isBinding } from "./authority-binding";

// Public helpers for downstream modules per contracts v2:
// computeCascadeReport (F-004) and enumerateOrphanCandidates (F-007). Plus
// rankPremiseReuse (deterministic v1).
export { computeCascadeReport, enumerateOrphanCandidates, rankPremiseReuse } from "./extras";
export type {
  CascadeReport,
  CascadeReason,
  OrphanCandidate,
  PremiseReuseSuggestion,
} from "./extras";
