import type { ValidationResult, NodeRef, NodeStatus, OpenGate } from "@/schema";
import type { AppState, FrameSummary } from "@/persistence";
import type { ComputeResult } from "@/runtime";
import { computeCascadeReport } from "@/runtime";
import type { CascadeReport } from "@/runtime";
import type { FrameVersion } from "@/schema";

// ---- Validation selectors ----

export function selectValidationErrors(
  validation: ReadonlyArray<ValidationResult>,
): ReadonlyArray<ValidationResult> {
  return validation.filter((r) => r.severity === "error");
}

export function selectValidationWarnings(
  validation: ReadonlyArray<ValidationResult>,
): ReadonlyArray<ValidationResult> {
  return validation.filter((r) => r.severity === "warning");
}

// ---- Node status selectors ----

export function selectNodeStatus(
  status_map: Readonly<Record<string, NodeStatus>>,
  node_id: NodeRef,
): NodeStatus | undefined {
  return status_map[node_id];
}

export function selectOpenGates(compute_result: ComputeResult): ReadonlyArray<OpenGate> {
  return compute_result.open_gates;
}

// ---- Status summary ----

export interface StatusSummary {
  satisfied: number;
  open: number;
  contested: number;
  foreclosed: number;
  not_applicable: number;
  total: number;
}

export function selectStatusSummary(compute_result: ComputeResult): StatusSummary {
  const counts: StatusSummary = {
    satisfied: 0,
    open: 0,
    contested: 0,
    foreclosed: 0,
    not_applicable: 0,
    total: 0,
  };
  compute_result.status_map.forEach((ns) => {
    counts.total += 1;
    counts[ns.status] += 1;
  });
  return counts;
}

// ---- Cascade summary ----

export function selectCascadeSummary(
  frame_version: FrameVersion,
  to_delete: { node_ids?: NodeRef[]; edge_ids?: string[] },
): CascadeReport {
  return computeCascadeReport(frame_version, to_delete);
}

// ---- Frame list selectors ----

export function selectPinnedFrames(frames: FrameSummary[], pinned: string[]): FrameSummary[] {
  const pinned_set = new Set(pinned);
  return frames.filter((f) => pinned_set.has(f.id));
}

// ---- App state selectors ----

export function selectFirstLaunchDismissed(app_state: AppState): boolean {
  return app_state.dismissed_warnings?.["first_launch"] === true;
}

export function selectNewFeatureNoticeSeen(app_state: AppState, feature_id: string): boolean {
  return app_state.seen_new_feature_notices?.[feature_id] === true;
}
