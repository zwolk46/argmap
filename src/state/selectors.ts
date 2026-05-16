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

// Memoization caches keyed on the SessionStoreSnapshot object itself.
// Zustand returns a stable snapshot ref between set() calls; we exploit that
// to cache derived results and return the SAME reference on consecutive
// calls. Without these caches, useSyncExternalStore detects every render's
// fresh array/object as a "snapshot changed" signal and forces another
// render, looping until React's max-update-depth trips. Fixes "Maximum
// update depth exceeded" thrown the first time the user navigated into
// argument-running with a freshly created session.
const STATUS_SUMMARY_CACHE = new WeakMap<SessionStoreSnapshot, StatusSummary | null>();
const INTERVIEW_ITEMS_CACHE = new WeakMap<SessionStoreSnapshot, InterviewItem[]>();
const EMPTY_INTERVIEW_ITEMS: InterviewItem[] = [];

export function selectStatusSummary(snapshot: SessionStoreSnapshot): StatusSummary | null {
  if (STATUS_SUMMARY_CACHE.has(snapshot)) return STATUS_SUMMARY_CACHE.get(snapshot) ?? null;
  const session = snapshot.session;
  const cr = snapshot.compute_result;
  let value: StatusSummary | null;
  if (!session || !cr || !cr.output) {
    value = null;
  } else {
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
    value = {
      shape: cr.output.shape,
      resolved_count: resolved,
      total_count: total,
      conclusion_label,
    };
  }
  STATUS_SUMMARY_CACHE.set(snapshot, value);
  return value;
}

// ---- Interview items (I.9c, F-022) ----

export function selectInterviewItems(snapshot: SessionStoreSnapshot): InterviewItem[] {
  if (INTERVIEW_ITEMS_CACHE.has(snapshot)) return INTERVIEW_ITEMS_CACHE.get(snapshot)!;
  const session = snapshot.session;
  const cr = snapshot.compute_result;
  const value =
    !session || !cr
      ? EMPTY_INTERVIEW_ITEMS
      : computeInterviewOrder(session.frame_version_snapshot, session, cr);
  INTERVIEW_ITEMS_CACHE.set(snapshot, value);
  return value;
}

// ---- Frame version drift (I.9c) ----

export interface FrameVersionDriftSummary {
  has_drift: boolean;
  session_version_number: number;
  current_version_number: number;
}

// Cache: (session_snapshot) -> (frame_snapshot) -> drift summary.
// Same memoization rationale as selectStatusSummary.
const DRIFT_CACHE = new WeakMap<
  SessionStoreSnapshot,
  WeakMap<FrameStoreSnapshot, FrameVersionDriftSummary | null>
>();

export function selectFrameVersionDrift(
  session_snapshot: SessionStoreSnapshot,
  frame_snapshot: FrameStoreSnapshot,
): FrameVersionDriftSummary | null {
  let inner = DRIFT_CACHE.get(session_snapshot);
  if (!inner) {
    inner = new WeakMap();
    DRIFT_CACHE.set(session_snapshot, inner);
  }
  if (inner.has(frame_snapshot)) return inner.get(frame_snapshot) ?? null;
  const session = session_snapshot.session;
  const fv = frame_snapshot.frame_version;
  const value: FrameVersionDriftSummary | null =
    !session || !fv
      ? null
      : {
          has_drift: session.frame_version_id !== fv.id,
          session_version_number: session.frame_version_snapshot.version_number,
          current_version_number: fv.version_number,
        };
  inner.set(frame_snapshot, value);
  return value;
}

// ---- Output viewer payload (I.9c) ----

export type OutputViewTab = "path_overlay" | "decision_tree" | "prose";

export interface OutputViewPayload {
  shape: SessionShape;
  prose?: { canonical: string; rewritten?: string };
  decision_tree?: { branches: ConditionalBranch[] };
  path_overlay?: { active_path: NodeRef[]; conclusion?: NodeRef };
}

// Cache keyed on (snapshot, tab) since callers usually subscribe to one tab.
const OUTPUT_FOR_VIEW_CACHE = new WeakMap<
  SessionStoreSnapshot,
  Map<OutputViewTab, OutputViewPayload | null>
>();

export function selectOutputForView(
  snapshot: SessionStoreSnapshot,
  tab: OutputViewTab,
): OutputViewPayload | null {
  let tab_map = OUTPUT_FOR_VIEW_CACHE.get(snapshot);
  if (!tab_map) {
    tab_map = new Map();
    OUTPUT_FOR_VIEW_CACHE.set(snapshot, tab_map);
  }
  if (tab_map.has(tab)) return tab_map.get(tab) ?? null;

  const session = snapshot.session;
  const session_version = snapshot.session_version;
  const cr = snapshot.compute_result;
  let value: OutputViewPayload | null = null;

  if (session && cr && cr.output) {
    const shape: SessionShape = cr.output.shape;
    if (tab === "prose") {
      const canonical = cr.output.prose_summary ?? "";
      const rewritten = session_version?.output_overrides?.rewritten_prose;
      value = { shape, prose: { canonical, rewritten } };
    } else if (tab === "decision_tree") {
      value = { shape, decision_tree: { branches: cr.output.branches ?? [] } };
    } else {
      value = {
        shape,
        path_overlay: {
          active_path: cr.output.primary_path ?? [],
          conclusion: cr.output.conclusion,
        },
      };
    }
  }
  tab_map.set(tab, value);
  return value;
}

// ---- Per-node status badge (I.9c convenience) ----

export interface StatusBadgeData {
  status: NodeStatus["status"];
  via?: NodeStatus["via"];
  failed_conditions?: string[];
}

// Cache keyed on (snapshot, node_id). Same memoization rationale.
const STATUS_BADGE_CACHE = new WeakMap<
  SessionStoreSnapshot,
  Map<NodeRef, StatusBadgeData | null>
>();

export function selectStatusBadge(
  snapshot: SessionStoreSnapshot,
  node_id: NodeRef,
): StatusBadgeData | null {
  let by_node = STATUS_BADGE_CACHE.get(snapshot);
  if (!by_node) {
    by_node = new Map();
    STATUS_BADGE_CACHE.set(snapshot, by_node);
  }
  if (by_node.has(node_id)) return by_node.get(node_id) ?? null;

  const cr = snapshot.compute_result;
  const ns = cr?.status_map.get(node_id);
  const value: StatusBadgeData | null = ns
    ? {
        status: ns.status,
        via: ns.via,
        failed_conditions: ns.failed_conditions,
      }
    : null;
  by_node.set(node_id, value);
  return value;
}

// ---- Cascade summary ----

export function selectCascadeSummary(
  frame_version: FrameVersion,
  to_delete: { node_ids?: NodeRef[]; edge_ids?: string[] },
): CascadeReport {
  return computeCascadeReport(frame_version, to_delete);
}

// ---- Per-node and per-edge validation selectors (E2 surface) ----

const VALIDATION_BY_NODE_CACHE = new WeakMap<
  FrameStoreSnapshot,
  ReadonlyMap<NodeRef, ReadonlyArray<ValidationResult>>
>();
const VALIDATION_BY_EDGE_CACHE = new WeakMap<
  FrameStoreSnapshot,
  ReadonlyMap<EdgeRef, ReadonlyArray<ValidationResult>>
>();

export function selectValidationByNode(
  snapshot: FrameStoreSnapshot,
): ReadonlyMap<NodeRef, ReadonlyArray<ValidationResult>> {
  const cached = VALIDATION_BY_NODE_CACHE.get(snapshot);
  if (cached) return cached;
  const map = new Map<NodeRef, ValidationResult[]>();
  for (const r of snapshot.validation) {
    if (r.node_id) {
      const arr = map.get(r.node_id) ?? [];
      arr.push(r);
      map.set(r.node_id, arr);
    }
  }
  VALIDATION_BY_NODE_CACHE.set(snapshot, map);
  return map;
}

export function selectValidationByEdge(
  snapshot: FrameStoreSnapshot,
): ReadonlyMap<EdgeRef, ReadonlyArray<ValidationResult>> {
  const cached = VALIDATION_BY_EDGE_CACHE.get(snapshot);
  if (cached) return cached;
  const map = new Map<EdgeRef, ValidationResult[]>();
  for (const r of snapshot.validation) {
    if (r.edge_id) {
      const arr = map.get(r.edge_id) ?? [];
      arr.push(r);
      map.set(r.edge_id, arr);
    }
  }
  VALIDATION_BY_EDGE_CACHE.set(snapshot, map);
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
  // The coachmark registry treats the welcome screen as
  // coachmark_dismissals["welcome_screen"]; legacy writes landed in
  // dismissed_warnings["first_launch"]. Accept either so users dismissed
  // under the old key aren't re-shown the wizard.
  return (
    app_state.coachmark_dismissals?.["welcome_screen"] === true ||
    app_state.dismissed_warnings?.["first_launch"] === true
  );
}

export function selectCoachmarkDismissed(app_state: AppState, coachmark_id: string): boolean {
  return app_state.coachmark_dismissals?.[coachmark_id] === true;
}

export function selectNewFeatureNoticeSeen(app_state: AppState, feature_id: string): boolean {
  return app_state.seen_new_feature_notices?.[feature_id] === true;
}
