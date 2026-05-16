import type {
  Frame,
  FrameVersion,
  ArgumentSession,
  ArgumentSessionVersion,
  FrameExport,
  ArgumentSessionExport,
  FrameId,
  FrameVersionId,
  SessionId,
  SessionVersionId,
  NodeRef,
  EdgeRef,
  Mode,
  Flavor,
} from "@/schema";
import type { PromptFileRecord } from "./dexie-schema";

export interface FrameSummary {
  id: FrameId;
  title: string;
  mode: "legal" | "general";
  flavor?: "personal" | "academic";
  tags: string[];
  pinned: boolean;
  updated_at: string;
  last_opened_at?: string;
  current_version_id: FrameVersionId;
}

export interface ArgumentSessionSummary {
  id: SessionId;
  frame_id: FrameId;
  title: string;
  updated_at: string;
  current_version_id: SessionVersionId;
  frame_version_drift_warning?: string;
}

export interface FrameVersionSummary {
  id: FrameVersionId;
  frame_id: FrameId;
  version_number: number;
  parent_version_id?: FrameVersionId;
  created_at: string;
  is_milestone: boolean;
  change_summary?: string;
}

export interface ArgumentSessionVersionSummary {
  id: SessionVersionId;
  session_id: SessionId;
  version_number: number;
  parent_version_id?: SessionVersionId;
  created_at: string;
  is_milestone: boolean;
  change_summary?: string;
}

export interface AppState {
  recents: FrameId[];
  pinned: FrameId[];
  default_output_view: "prose" | "decision_tree" | "path_overlay";
  side_panel_collapsed: { [pane: string]: boolean };
  coachmark_dismissals: { [coachmark_id: string]: boolean };
  app_provider_default?: string;
  last_known_schema_version: number;
  // F-015: additive fields for state layer (optional for backward compat)
  dismissed_warnings?: { [warning_id: string]: boolean };
  seen_new_feature_notices?: { [feature_id: string]: boolean };
  output_view_tab_choice_by_frame?: { [frame_id: string]: string };
  pane_widths?: { [pane_id: string]: number };
}

export interface FrameSearchHit {
  frame_id: FrameId;
  title: string;
  hit_field: "title" | "description" | "tag" | "node_text" | "conclusion_statement";
  snippet: string;
}

export interface OrphanResolution {
  kind: "discard" | "reattach" | "no_op";
  source_node_id?: NodeRef;
  target_node_id?: NodeRef;
}

export class QuotaExceededError extends Error {
  readonly kind = "quota_exceeded" as const;
  constructor(message?: string) {
    super(message ?? "IndexedDB quota exceeded");
    this.name = "QuotaExceededError";
  }
}

export type RepositoryErrorCode =
  | "not_found"
  | "app_state_missing"
  | "network"
  | "permission_denied"
  | "unknown";

export class RepositoryError extends Error {
  readonly kind = "repository_error" as const;
  readonly operation: string;
  /**
   * Stable code for branching on error kind. Callers prefer this over
   * message-string matching (which is brittle: the message text drifts as
   * we surface more context to users).
   */
  readonly code: RepositoryErrorCode;
  constructor(operation: string, message?: string, code: RepositoryErrorCode = "unknown") {
    super(message ?? `Repository operation failed: ${operation}`);
    this.name = "RepositoryError";
    this.operation = operation;
    this.code = code;
  }
}

export interface Repository {
  // Frames
  listFrames(): Promise<FrameSummary[]>;
  loadFrame(frame_id: FrameId): Promise<Frame>;
  saveFrame(frame: Frame): Promise<void>;
  deleteFrame(frame_id: FrameId): Promise<void>;

  // FrameVersions
  listFrameVersions(frame_id: FrameId): Promise<FrameVersion[]>;
  listFrameVersionSummaries(frame_id: FrameId): Promise<FrameVersionSummary[]>;
  loadFrameVersion(version_id: FrameVersionId): Promise<FrameVersion>;
  saveFrameVersion(version: FrameVersion): Promise<void>;

  // Argument sessions
  listSessionsForFrame(frame_id: FrameId): Promise<ArgumentSessionSummary[]>;
  loadSession(session_id: SessionId): Promise<ArgumentSession>;
  saveSession(session: ArgumentSession): Promise<void>;
  deleteSession(session_id: SessionId): Promise<void>;

  listSessionVersions(session_id: SessionId): Promise<ArgumentSessionVersion[]>;
  listSessionVersionSummaries(session_id: SessionId): Promise<ArgumentSessionVersionSummary[]>;
  loadSessionVersion(version_id: SessionVersionId): Promise<ArgumentSessionVersion>;
  saveSessionVersion(version: ArgumentSessionVersion): Promise<void>;

  // Composite operations — atomic per Stream H "Atomicity contracts" section.
  createBlankFrame(opts: {
    title: string;
    mode?: Mode;
    flavor?: Flavor;
  }): Promise<{ frame: Frame; version: FrameVersion }>;
  createFrameFromTemplate(template_frame_id: FrameId, new_title: string): Promise<Frame>;
  migrateSession(
    session_id: SessionId,
    target_frame_version_id: FrameVersionId,
    orphan_resolutions: OrphanResolution[],
  ): Promise<ArgumentSessionVersion>;
  restoreFrameVersion(
    frame_id: FrameId,
    ancestor_version_id: FrameVersionId,
    /**
     * Optional custom change_summary stamped on the new version. P1: when
     * supplied, the repository writes it inside the same transaction
     * instead of forcing the caller to issue a second saveFrameVersion
     * just to overwrite the default "Restored from version N" copy.
     */
    change_summary?: string,
  ): Promise<FrameVersion>;
  restoreSessionVersion(
    session_id: SessionId,
    ancestor_version_id: SessionVersionId,
    change_summary?: string,
  ): Promise<ArgumentSessionVersion>;

  // App state (per-user, not versioned).
  loadAppState(): Promise<AppState>;
  saveAppState(state: AppState): Promise<void>;

  // Search.
  searchFrames(query: string): Promise<FrameSearchHit[]>;

  // Export / import. Migrations run at import time per @/schema's migrate().
  exportFrame(frame_id: FrameId, opts: { include_history: boolean }): Promise<FrameExport>;
  exportSession(
    session_id: SessionId,
    opts: { include_frame: boolean; include_history: boolean },
  ): Promise<ArgumentSessionExport>;
  importFrame(envelope: FrameExport): Promise<Frame>;
  importSession(envelope: ArgumentSessionExport): Promise<ArgumentSession>;

  // Prompt file store — used by llm-hooks to cache bundled prompts.
  loadPrompt(hook_name: string, version: string): Promise<PromptFileRecord | null>;
  savePrompt(record: PromptFileRecord): Promise<void>;
}

export type { PromptFileRecord };

export interface PendingFrameSave {
  frame: Frame;
  new_version: FrameVersion;
  change_summary?: string;
}

export interface PendingSessionSave {
  session: ArgumentSession;
  new_version: ArgumentSessionVersion;
  change_summary?: string;
}

export interface SaveEvent {
  kind: "frame" | "session" | "app_state";
  id?: string;
  version_id?: string;
  error?: QuotaExceededError | RepositoryError;
}

export type AutosaveEvent = "save_succeeded" | "save_failed";
export type Unsubscribe = () => void;

export interface AutosaveController {
  scheduleFrameSave(payload: PendingFrameSave): void;
  scheduleSessionSave(payload: PendingSessionSave): void;
  scheduleAppStateSave(state: AppState): void;

  flushAll(): Promise<void>;
  flushFrame(frame_id: FrameId): Promise<void>;
  flushSession(session_id: SessionId): Promise<void>;
  flushAppState(): Promise<void>;

  saveFrameMilestone(payload: PendingFrameSave): Promise<void>;
  saveSessionMilestone(payload: PendingSessionSave): Promise<void>;

  on(event: AutosaveEvent, listener: (info: SaveEvent) => void): Unsubscribe;

  dispose(): void;
}

export const LAYOUT_ONLY_FIELDS = ["presentation"] as const;

export interface NodeEditEntry {
  id: NodeRef;
  fields_changed: string[];
}

export interface EdgeEditEntry {
  id: EdgeRef;
  fields_changed: string[];
}

export interface MetadataChange {
  field: string;
}

export interface StructuralDiff {
  nodes: {
    added: NodeRef[];
    removed: NodeRef[];
    edited: NodeEditEntry[];
  };
  edges: {
    added: EdgeRef[];
    removed: EdgeRef[];
    edited: EdgeEditEntry[];
  };
  metadata: {
    changed_fields: MetadataChange[];
  };
  layout_only: boolean;
  layout_changed_count: number;
}

export interface ArgumentEdgeEditEntry {
  id: EdgeRef;
  fields_changed: string[];
}
export interface PremiseEditEntry {
  id: NodeRef;
  fields_changed: string[];
}
export interface CheckpointResponseEditEntry {
  checkpoint_id: NodeRef;
  fields_changed: string[];
}
export interface AuthorityEditEntry {
  id: NodeRef;
  fields_changed: string[];
}
export interface InterpretationSelectionEditEntry {
  term_id: NodeRef;
  fields_changed: string[];
}

export interface SessionStructuralDiff {
  premises: {
    added: NodeRef[];
    removed: NodeRef[];
    edited: PremiseEditEntry[];
  };
  argument_edges: {
    added: EdgeRef[];
    removed: EdgeRef[];
    edited: ArgumentEdgeEditEntry[];
  };
  checkpoint_responses: {
    added: NodeRef[];
    removed: NodeRef[];
    edited: CheckpointResponseEditEntry[];
  };
  session_authorities: {
    added: NodeRef[];
    removed: NodeRef[];
    edited: AuthorityEditEntry[];
  };
  interpretation_selections: {
    added: NodeRef[];
    removed: NodeRef[];
    edited: InterpretationSelectionEditEntry[];
  };
  metadata: { changed_fields: MetadataChange[] };
}

export interface BroadcastEvents {
  frame_saved: { frame_id: FrameId; version_id: FrameVersionId };
  session_saved: { session_id: SessionId; version_id: SessionVersionId };
  /** P0-5: a frame was deleted in another tab. Peers drop it from their
   *  in-memory AppState.recents / .pinned and refresh the frames list. */
  frame_deleted: { frame_id: FrameId };
  /** P0-2: a session was deleted in another tab. Peers refresh their
   *  in-memory state so they don't render a tombstoned session id. */
  session_deleted: { session_id: SessionId };
  /** P0-5: AppState was rewritten in another tab (pin, recent, dismissal,
   *  coachmark, etc.). Peers re-read AppState from disk to absorb it. */
  app_state_changed: Record<string, never>;
}

export interface CrossTabBus {
  publish<K extends keyof BroadcastEvents>(event: K, payload: BroadcastEvents[K]): void;
  subscribe<K extends keyof BroadcastEvents>(
    event: K,
    listener: (payload: BroadcastEvents[K]) => void,
  ): Unsubscribe;
  close(): void;
}
