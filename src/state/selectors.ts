import type {
  ValidationResult,
  NodeRef,
  EdgeRef,
  NodeStatus,
  OpenGate,
  FrameVersion,
  Node,
  ConditionalBranch,
} from "@/schema";
import { VALIDATION_RULE_PRIORITY } from "@/schema";
import type { AppState, FrameSummary } from "@/persistence";
import type { ComputeResult } from "@/runtime";
import { computeCascadeReport } from "@/runtime";
import type { CascadeReport } from "@/runtime";
import { computeInterviewOrder, type InterviewItem } from "@/modes";
import type { FrameStoreSnapshot } from "./frame-store";
import type { SessionStoreSnapshot } from "./session-store";

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

// ---- Per-status counts (frame-building) ----

export interface NodeStatusCounts {
  satisfied: number;
  open: number;
  contested: number;
  foreclosed: number;
  not_applicable: number;
  total: number;
}

export function selectNodeStatusCounts(compute_result: ComputeResult): NodeStatusCounts {
  const counts: NodeStatusCounts = {
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

// ---- Argument-running status summary (I.9c, F-022) ----

export type SessionShape = "determinate" | "conditional" | "contested" | "incomplete";

export interface StatusSummary {
  shape: SessionShape;
  resolved_count: number;
  total_count: number;
  conclusion_label?: string;
}

function findConclusionLabel(
  frame_version: FrameVersion,
  conclusion_id?: NodeRef,
): string | undefined {
  if (!conclusion_id) return undefined;
  const node = frame_version.nodes.find((n) => n.id === conclusion_id);
  if (!node || node.type !== "Conclusion") return undefined;
  const c = node as Node & { direction?: { value?: string }; statement?: string };
  return c.direction?.value ?? c.statement;
}

export function selectStatusSummary(snapshot: SessionStoreSnapshot): StatusSummary | null {
  const session = snapshot.session;
  const cr = snapshot.compute_result;
  if (!session || !cr || !cr.output) return null;

  let resolved = 0;
  let total = 0;
  cr.status_map.forEach((ns) => {
    total += 1;
    if (ns.status === "satisfied") resolved += 1;
  });

  const conclusion_label = findConclusionLabel(
    session.frame_version_snapshot,
    cr.output.conclusion,
  );

  return {
    shape: cr.output.shape,
    resolved_count: resolved,
    total_count: total,
    conclusion_label,
  };
}

// ---- Interview items (I.9c, F-022) ----

export function selectInterviewItems(snapshot: SessionStoreSnapshot): InterviewItem[] {
  const session = snapshot.session;
  const cr = snapshot.compute_result;
  if (!session || !cr) return [];
  return computeInterviewOrder(session.frame_version_snapshot, session, cr);
}

// ---- Frame version drift (I.9c) ----

export interface FrameVersionDriftSummary {
  has_drift: boolean;
  session_version_number: number;
  current_version_number: number;
}

export function selectFrameVersionDrift(
  session_snapshot: SessionStoreSnapshot,
  frame_snapshot: FrameStoreSnapshot,
): FrameVersionDriftSummary | null {
  const session = session_snapshot.session;
  const fv = frame_snapshot.frame_version;
  if (!session || !fv) return null;
  return {
    has_drift: session.frame_version_id !== fv.id,
    session_version_number: session.frame_version_snapshot.version_number,
    current_version_number: fv.version_number,
  };
}

// ---- Output viewer payload (I.9c) ----

export type OutputViewTab = "path_overlay" | "decision_tree" | "prose";

export interface OutputViewPayload {
  shape: SessionShape;
  prose?: { canonical: string; rewritten?: string };
  decision_tree?: { branches: ConditionalBranch[] };
  path_overlay?: { active_path: NodeRef[]; conclusion?: NodeRef };
}

export function selectOutputForView(
  snapshot: SessionStoreSnapshot,
  tab: OutputViewTab,
): OutputViewPayload | null {
  const session = snapshot.session;
  const session_version = snapshot.session_version;
  const cr = snapshot.compute_result;
  if (!session || !cr || !cr.output) return null;

  const shape: SessionShape = cr.output.shape;

  if (tab === "prose") {
    const canonical = cr.output.prose_summary ?? "";
    const rewritten = session_version?.output_overrides?.rewritten_prose;
    return { shape, prose: { canonical, rewritten } };
  }
  if (tab === "decision_tree") {
    return { shape, decision_tree: { branches: cr.output.branches ?? [] } };
  }
  // path_overlay
  return {
    shape,
    path_overlay: {
      active_path: cr.output.primary_path ?? [],
      conclusion: cr.output.conclusion,
    },
  };
}

// ---- Per-node status badge (I.9c convenience) ----

export interface StatusBadgeData {
  status: NodeStatus["status"];
  via?: NodeStatus["via"];
  failed_conditions?: string[];
}

export function selectStatusBadge(
  snapshot: SessionStoreSnapshot,
  node_id: NodeRef,
): StatusBadgeData | null {
  const cr = snapshot.compute_result;
  if (!cr) return null;
  const ns = cr.status_map.get(node_id);
  if (!ns) return null;
  return {
    status: ns.status,
    via: ns.via,
    failed_conditions: ns.failed_conditions,
  };
}

// ---- Cascade summary ----

export function selectCascadeSummary(
  frame_version: FrameVersion,
  to_delete: { node_ids?: NodeRef[]; edge_ids?: string[] },
): CascadeReport {
  return computeCascadeReport(frame_version, to_delete);
}

// ---- Per-node and per-edge validation selectors (E2 surface) ----

export function selectValidationByNode(
  snapshot: FrameStoreSnapshot,
): ReadonlyMap<NodeRef, ReadonlyArray<ValidationResult>> {
  const map = new Map<NodeRef, ValidationResult[]>();
  for (const r of snapshot.validation) {
    if (r.node_id) {
      const arr = map.get(r.node_id) ?? [];
      arr.push(r);
      map.set(r.node_id, arr);
    }
  }
  return map;
}

export function selectValidationByEdge(
  snapshot: FrameStoreSnapshot,
): ReadonlyMap<EdgeRef, ReadonlyArray<ValidationResult>> {
  const map = new Map<EdgeRef, ValidationResult[]>();
  for (const r of snapshot.validation) {
    if (r.edge_id) {
      const arr = map.get(r.edge_id) ?? [];
      arr.push(r);
      map.set(r.edge_id, arr);
    }
  }
  return map;
}

export interface ValidationDrawerEntry {
  rule_id: string;
  severity: "error" | "warning";
  message: string;
  node_id?: NodeRef;
  edge_id?: EdgeRef;
}

function validationSortKey(r: ValidationResult): string {
  const sev = r.severity === "error" ? "0" : "1";
  const pri = String(VALIDATION_RULE_PRIORITY[r.rule_id] ?? 9999).padStart(6, "0");
  const nid = r.node_id ?? "";
  const eid = r.edge_id ?? "";
  return `${sev}:${pri}:${nid}:${eid}`;
}

export function selectValidationDrawer(
  snapshot: FrameStoreSnapshot,
): ReadonlyArray<ValidationDrawerEntry> {
  return [...snapshot.validation]
    .sort((a, b) => validationSortKey(a).localeCompare(validationSortKey(b)))
    .map((r) => ({
      rule_id: r.rule_id,
      severity: r.severity,
      message: r.message,
      node_id: r.node_id,
      edge_id: r.edge_id,
    }));
}

export function selectFrameCanCommitTransition(snapshot: FrameStoreSnapshot): boolean {
  return snapshot.validation.every((r) => r.severity !== "error");
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

export function selectCoachmarkDismissed(
  app_state: AppState,
  coachmark_id: string,
): boolean {
  return app_state.coachmark_dismissals?.[coachmark_id] === true;
}

export function selectNewFeatureNoticeSeen(app_state: AppState, feature_id: string): boolean {
  return app_state.seen_new_feature_notices?.[feature_id] === true;
}
