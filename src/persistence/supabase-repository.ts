// SupabaseRepository — server-side persistence for argmap (Wave F).
//
// Implements the Repository interface against Supabase Postgres. Every
// table row is owned by an auth.users.id and gated by RLS, so this class
// trusts that the provided SupabaseClient is authenticated; an
// unauthenticated client will silently return empty rowsets for every
// SELECT (RLS denies anonymous access).
//
// Design notes:
// - Payload stored as JSONB. We deserialize on read; on write we send the
//   full TypeScript object. This keeps the in-memory schema flexible.
// - "Atomicity" methods (createBlankFrame, restoreFrameVersion,
//   migrateSession, deleteFrame) do their work as a sequence of client
//   writes rather than a true Postgres transaction. For real atomicity
//   we'd move them to SQL RPC functions; v1 trades that off for
//   developer velocity. The deletes use ON DELETE CASCADE in schema.sql,
//   so deleting a frame correctly removes its versions, sessions, and
//   session versions in one server round-trip.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Frame,
  FrameVersion,
  ArgumentSession,
  ArgumentSessionVersion,
  FrameId,
  FrameVersionId,
  SessionId,
  SessionVersionId,
  Mode,
  Flavor,
} from "@/schema";
import { migrate } from "@/schema";
import type {
  Repository,
  AppState,
  FrameSummary,
  ArgumentSessionSummary,
  FrameVersionSummary,
  ArgumentSessionVersionSummary,
  FrameSearchHit,
  OrphanResolution,
  PromptFileRecord,
} from "./repository";
import { RepositoryError } from "./repository";
import type { FrameExport, ArgumentSessionExport } from "@/schema";

export interface SupabaseRepositoryOpts {
  client: SupabaseClient;
  /** Server-issued user id (Supabase Auth `auth.uid()`). Required for writes. */
  user_id: string;
  /** Wall-clock injected — kept off the determinism boundary in the runtime. */
  now?: () => string;
  /** Injected ID generator (UUIDs by default). */
  generateId?: () => string;
}

export class SupabaseRepository implements Repository {
  private readonly client: SupabaseClient;
  private readonly user_id: string;
  private readonly now: () => string;
  private readonly generateId: () => string;

  constructor(opts: SupabaseRepositoryOpts) {
    this.client = opts.client;
    this.user_id = opts.user_id;
    this.now = opts.now ?? (() => new Date().toISOString());
    this.generateId = opts.generateId ?? (() => crypto.randomUUID());
  }

  // ----- lifecycle (no-op on Supabase; tables come from schema.sql) -----

  async openOrUpgrade(): Promise<void> {
    // No-op: schema lives in Supabase and is provisioned via SQL editor.
  }

  close(): void {
    // No-op: SupabaseClient holds an internal pool managed by @supabase/supabase-js.
  }

  // ----- Frames -----

  async listFrames(): Promise<FrameSummary[]> {
    const { data, error } = await this.client
      .from("frames")
      .select("id, payload, title, updated_at, archived")
      .eq("user_id", this.user_id)
      .eq("archived", false)
      .order("updated_at", { ascending: false });
    if (error) throw new RepositoryError("listFrames", error.message);
    return (data ?? []).map((row): FrameSummary => {
      const f = row.payload as Frame;
      return {
        id: f.id,
        title: f.title,
        mode: f.mode,
        flavor: f.flavor,
        tags: f.tags ?? [],
        pinned: f.pinned ?? false,
        updated_at: row.updated_at,
        current_version_id: f.current_version_id,
      } as unknown as FrameSummary;
    });
  }

  async loadFrame(frame_id: FrameId): Promise<Frame> {
    const { data, error } = await this.client
      .from("frames")
      .select("payload")
      .eq("id", frame_id)
      .eq("user_id", this.user_id)
      .single();
    if (error || !data) throw new RepositoryError("loadFrame", `Frame not found: ${frame_id}`);
    return data.payload as Frame;
  }

  async saveFrame(frame: Frame): Promise<void> {
    // H-11: keep payload.updated_at in lockstep with the column. Previously
    // the column got `this.now()` but the payload kept whatever stale value
    // was on the in-memory Frame, so loadFrame returned a wall-clock that
    // disagreed with listFrames.
    const now = this.now();
    const stamped: Frame = { ...frame, updated_at: now };
    const { error } = await this.client.from("frames").upsert({
      id: stamped.id,
      user_id: this.user_id,
      payload: stamped,
      title: stamped.title,
      archived: stamped.archived ?? false,
      updated_at: now,
    });
    if (error) throw new RepositoryError("saveFrame", error.message);
  }

  async deleteFrame(frame_id: FrameId): Promise<void> {
    // ON DELETE CASCADE handles frame_versions, argument_sessions,
    // argument_session_versions, search_index.
    const { error } = await this.client
      .from("frames")
      .delete()
      .eq("id", frame_id)
      .eq("user_id", this.user_id);
    if (error) throw new RepositoryError("deleteFrame", error.message);
  }

  // ----- FrameVersions -----

  async listFrameVersions(frame_id: FrameId): Promise<FrameVersion[]> {
    const { data, error } = await this.client
      .from("frame_versions")
      .select("payload")
      .eq("frame_id", frame_id)
      .eq("user_id", this.user_id)
      .order("version_number", { ascending: true });
    if (error) throw new RepositoryError("listFrameVersions", error.message);
    return (data ?? []).map((row) => row.payload as FrameVersion);
  }

  async listFrameVersionSummaries(frame_id: FrameId): Promise<FrameVersionSummary[]> {
    const { data, error } = await this.client
      .from("frame_versions")
      .select(
        "id, frame_id, version_number, parent_version_id, created_at, is_milestone, change_summary",
      )
      .eq("frame_id", frame_id)
      .eq("user_id", this.user_id)
      .order("version_number", { ascending: true });
    if (error) throw new RepositoryError("listFrameVersionSummaries", error.message);
    return (data ?? []) as FrameVersionSummary[];
  }

  async loadFrameVersion(version_id: FrameVersionId): Promise<FrameVersion> {
    const { data, error } = await this.client
      .from("frame_versions")
      .select("payload")
      .eq("id", version_id)
      .eq("user_id", this.user_id)
      .single();
    if (error || !data) {
      throw new RepositoryError("loadFrameVersion", `FrameVersion not found: ${version_id}`);
    }
    return data.payload as FrameVersion;
  }

  async saveFrameVersion(version: FrameVersion): Promise<void> {
    // P0-4: re-stamp parent_version_id + version_number against the on-disk
    // current. Mirrors IndexedDbRepository.saveFrameVersion.
    const existing = await this.client
      .from("frame_versions")
      .select("id, version_number, parent_version_id")
      .eq("id", version.id)
      .eq("user_id", this.user_id)
      .maybeSingle();

    const frame_row = await this.client
      .from("frames")
      .select("payload")
      .eq("id", version.frame_id)
      .eq("user_id", this.user_id)
      .single();
    if (frame_row.error || !frame_row.data) {
      throw new RepositoryError("saveFrameVersion", `Parent Frame missing: ${version.frame_id}`);
    }
    const frame = frame_row.data.payload as Frame;

    let to_write: FrameVersion;
    if (existing.data) {
      to_write = {
        ...version,
        parent_version_id: existing.data.parent_version_id ?? version.parent_version_id,
        version_number: existing.data.version_number,
      };
    } else {
      const prior_id = frame.current_version_id;
      let prior_version_number = 0;
      let prior_real_id: string | undefined;
      if (prior_id && prior_id !== version.id) {
        const prior = await this.client
          .from("frame_versions")
          .select("id, version_number")
          .eq("id", prior_id)
          .eq("user_id", this.user_id)
          .maybeSingle();
        if (prior.data) {
          prior_version_number = prior.data.version_number;
          prior_real_id = prior.data.id;
        }
      }
      to_write = {
        ...version,
        parent_version_id: prior_real_id,
        version_number: prior_real_id ? prior_version_number + 1 : 1,
      };
    }

    const fv_upsert = await this.client.from("frame_versions").upsert({
      id: to_write.id,
      user_id: this.user_id,
      frame_id: to_write.frame_id,
      payload: to_write,
      version_number: to_write.version_number,
      parent_version_id: to_write.parent_version_id ?? null,
      created_at: to_write.created_at,
      is_milestone: to_write.is_milestone ?? false,
      change_summary: to_write.change_summary ?? null,
    });
    if (fv_upsert.error) throw new RepositoryError("saveFrameVersion", fv_upsert.error.message);

    // H-12: bump the parent Frame's payload.updated_at when its
    // current_version_id changes. saveFrame restamps below, but doing so
    // here too keeps the in-memory Frame consistent for any caller that
    // reads `frame.updated_at` between this line and the next saveFrame.
    const next_frame: Frame = {
      ...frame,
      current_version_id: to_write.id,
      updated_at: this.now(),
    };
    await this.saveFrame(next_frame);

    // Update the per-frame search index with text harvested from nodes.
    await this.upsertSearchIndex(next_frame, to_write);
  }

  // ----- Argument sessions -----

  async listSessionsForFrame(frame_id: FrameId): Promise<ArgumentSessionSummary[]> {
    const { data, error } = await this.client
      .from("argument_sessions")
      .select("id, payload, title, updated_at, archived")
      .eq("user_id", this.user_id)
      .eq("frame_id", frame_id)
      .eq("archived", false)
      .order("updated_at", { ascending: false });
    if (error) throw new RepositoryError("listSessionsForFrame", error.message);
    return (data ?? []).map((row): ArgumentSessionSummary => {
      const s = row.payload as ArgumentSession;
      return {
        id: s.id,
        frame_id: s.frame_id,
        title: s.title,
        updated_at: row.updated_at,
        current_version_id: s.current_version_id,
      } as unknown as ArgumentSessionSummary;
    });
  }

  async loadSession(session_id: SessionId): Promise<ArgumentSession> {
    const { data, error } = await this.client
      .from("argument_sessions")
      .select("payload")
      .eq("id", session_id)
      .eq("user_id", this.user_id)
      .single();
    if (error || !data) {
      throw new RepositoryError("loadSession", `Session not found: ${session_id}`);
    }
    return data.payload as ArgumentSession;
  }

  async saveSession(session: ArgumentSession): Promise<void> {
    const { error } = await this.client.from("argument_sessions").upsert({
      id: session.id,
      user_id: this.user_id,
      frame_id: session.frame_id,
      payload: session,
      title: session.title,
      archived: session.archived ?? false,
      updated_at: this.now(),
    });
    if (error) throw new RepositoryError("saveSession", error.message);
  }

  async deleteSession(session_id: SessionId): Promise<void> {
    const { error } = await this.client
      .from("argument_sessions")
      .delete()
      .eq("id", session_id)
      .eq("user_id", this.user_id);
    if (error) throw new RepositoryError("deleteSession", error.message);
  }

  async listSessionVersions(session_id: SessionId): Promise<ArgumentSessionVersion[]> {
    const { data, error } = await this.client
      .from("argument_session_versions")
      .select("payload")
      .eq("session_id", session_id)
      .eq("user_id", this.user_id)
      .order("version_number", { ascending: true });
    if (error) throw new RepositoryError("listSessionVersions", error.message);
    return (data ?? []).map((row) => row.payload as ArgumentSessionVersion);
  }

  async listSessionVersionSummaries(
    session_id: SessionId,
  ): Promise<ArgumentSessionVersionSummary[]> {
    const { data, error } = await this.client
      .from("argument_session_versions")
      .select(
        "id, session_id, version_number, parent_version_id, created_at, is_milestone, change_summary",
      )
      .eq("session_id", session_id)
      .eq("user_id", this.user_id)
      .order("version_number", { ascending: true });
    if (error) throw new RepositoryError("listSessionVersionSummaries", error.message);
    return (data ?? []) as ArgumentSessionVersionSummary[];
  }

  async loadSessionVersion(version_id: SessionVersionId): Promise<ArgumentSessionVersion> {
    const { data, error } = await this.client
      .from("argument_session_versions")
      .select("payload")
      .eq("id", version_id)
      .eq("user_id", this.user_id)
      .single();
    if (error || !data) {
      throw new RepositoryError(
        "loadSessionVersion",
        `ArgumentSessionVersion not found: ${version_id}`,
      );
    }
    return data.payload as ArgumentSessionVersion;
  }

  async saveSessionVersion(version: ArgumentSessionVersion): Promise<void> {
    const existing = await this.client
      .from("argument_session_versions")
      .select("id, version_number, parent_version_id")
      .eq("id", version.id)
      .eq("user_id", this.user_id)
      .maybeSingle();

    const session_row = await this.client
      .from("argument_sessions")
      .select("payload")
      .eq("id", version.session_id)
      .eq("user_id", this.user_id)
      .single();
    if (session_row.error || !session_row.data) {
      throw new RepositoryError(
        "saveSessionVersion",
        `Parent ArgumentSession missing: ${version.session_id}`,
      );
    }
    const session = session_row.data.payload as ArgumentSession;

    // §8 #1: backfill the frame snapshot from the parent session if the
    // caller didn't supply one (legacy persistence-test paths, raw writes).
    // Action-runner, migrate, restore, and initial-creation paths all set
    // it directly; this is the safety net for everything else.
    const with_snapshot: ArgumentSessionVersion = version.frame_version_snapshot
      ? version
      : { ...version, frame_version_snapshot: session.frame_version_snapshot };

    let to_write: ArgumentSessionVersion;
    if (existing.data) {
      to_write = {
        ...with_snapshot,
        parent_version_id: existing.data.parent_version_id ?? with_snapshot.parent_version_id,
        version_number: existing.data.version_number,
      };
    } else {
      const prior_id = session.current_version_id;
      let prior_version_number = 0;
      let prior_real_id: string | undefined;
      if (prior_id && prior_id !== version.id) {
        const prior = await this.client
          .from("argument_session_versions")
          .select("id, version_number")
          .eq("id", prior_id)
          .eq("user_id", this.user_id)
          .maybeSingle();
        if (prior.data) {
          prior_version_number = prior.data.version_number;
          prior_real_id = prior.data.id;
        }
      }
      to_write = {
        ...with_snapshot,
        parent_version_id: prior_real_id,
        version_number: prior_real_id ? prior_version_number + 1 : 1,
      };
    }

    const sv_upsert = await this.client.from("argument_session_versions").upsert({
      id: to_write.id,
      user_id: this.user_id,
      session_id: to_write.session_id,
      payload: to_write,
      version_number: to_write.version_number,
      parent_version_id: to_write.parent_version_id ?? null,
      created_at: to_write.created_at,
      is_milestone: to_write.is_milestone ?? false,
      change_summary: to_write.change_summary ?? null,
    });
    if (sv_upsert.error) throw new RepositoryError("saveSessionVersion", sv_upsert.error.message);

    const next_session: ArgumentSession = { ...session, current_version_id: to_write.id };
    await this.saveSession(next_session);
  }

  // ----- Composite operations -----

  async createBlankFrame(opts: {
    title: string;
    mode?: Mode;
    flavor?: Flavor;
  }): Promise<{ frame: Frame; version: FrameVersion }> {
    const ts = this.now();
    const frame_id = this.generateId();
    const version_id = this.generateId();
    const version: FrameVersion = {
      id: version_id,
      frame_id,
      version_number: 1,
      created_at: ts,
      is_milestone: true,
      change_summary: "Initial version",
      nodes: [],
      edges: [],
    };
    const frame: Frame = {
      id: frame_id,
      title: opts.title,
      mode: opts.mode ?? "general",
      flavor: opts.flavor,
      default_satisfaction_policies: {},
      tags: [],
      pinned: false,
      created_at: ts,
      updated_at: ts,
      current_version_id: version_id,
    };
    await this.saveFrame(frame);
    await this.saveFrameVersion(version);
    return { frame, version };
  }

  async createFrameFromTemplate(template_frame_id: FrameId, new_title: string): Promise<Frame> {
    const source = await this.loadFrame(template_frame_id);
    const source_version = await this.loadFrameVersion(source.current_version_id);

    // Re-id every node and edge with translation, mirroring the IndexedDb impl.
    const node_id_map = new Map<string, string>();
    for (const n of source_version.nodes) node_id_map.set(n.id, this.generateId());
    const translate = (ref: string | undefined): string | undefined =>
      ref ? (node_id_map.get(ref) ?? ref) : undefined;

    const new_nodes = source_version.nodes.map((node) => {
      const n: { id: string; type: string; [key: string]: unknown } = JSON.parse(
        JSON.stringify(node),
      );
      n.id = node_id_map.get(node.id) ?? node.id;
      if (n.type === "Checkpoint" && Array.isArray(n.options)) {
        n.options = (n.options as Array<{ id: string; target_node_id?: string }>).map((opt) => ({
          ...opt,
          target_node_id: translate(opt.target_node_id),
        }));
      }
      if (n.type === "LogicalGate") {
        if ("output_target" in n)
          n.output_target = translate(n.output_target as string | undefined);
      }
      return n as unknown as (typeof source_version.nodes)[number];
    });

    const new_edges = source_version.edges.map((edge) => {
      const e = JSON.parse(JSON.stringify(edge)) as typeof edge;
      e.id = this.generateId();
      e.source = (node_id_map.get(e.source) ?? e.source) as typeof e.source;
      e.target = (node_id_map.get(e.target) ?? e.target) as typeof e.target;
      return e;
    });

    const ts = this.now();
    const new_frame_id = this.generateId();
    const new_version_id = this.generateId();

    const new_version: FrameVersion = {
      id: new_version_id,
      frame_id: new_frame_id,
      version_number: 1,
      created_at: ts,
      is_milestone: true,
      change_summary: `Created from template: ${source.title}`,
      nodes: new_nodes,
      edges: new_edges,
    };
    const new_frame: Frame = {
      ...JSON.parse(JSON.stringify(source)),
      id: new_frame_id,
      title: new_title,
      current_version_id: new_version_id,
      created_at: ts,
      updated_at: ts,
    };
    await this.saveFrame(new_frame);
    await this.saveFrameVersion(new_version);
    return new_frame;
  }

  async migrateSession(
    session_id: SessionId,
    target_frame_version_id: FrameVersionId,
    orphan_resolutions: OrphanResolution[],
  ): Promise<ArgumentSessionVersion> {
    const session = await this.loadSession(session_id);
    const prior_version = await this.loadSessionVersion(session.current_version_id);
    const target = await this.loadFrameVersion(target_frame_version_id);

    const resolution_map = new Map<string, OrphanResolution>();
    for (const res of orphan_resolutions) {
      if (res.source_node_id) resolution_map.set(res.source_node_id, res);
    }
    const rewrite = (ref: string): string | null => {
      const res = resolution_map.get(ref);
      if (!res) return ref;
      if (res.kind === "discard") return null;
      if (res.kind === "reattach" && res.target_node_id) return res.target_node_id;
      return ref;
    };

    const new_premises = (prior_version.premises ?? [])
      .filter((p) => {
        const res = resolution_map.get(p.id);
        return !res || res.kind !== "discard";
      })
      .map((p) => {
        const res = resolution_map.get(p.id);
        if (res?.kind === "reattach" && res.target_node_id) return { ...p, id: res.target_node_id };
        return p;
      });

    const new_arg_edges = (prior_version.argument_edges ?? [])
      .filter((e) => rewrite(e.source) !== null && rewrite(e.target) !== null)
      .map((e) => ({ ...e, source: rewrite(e.source)!, target: rewrite(e.target)! }));

    const new_checkpoint_responses = (prior_version.checkpoint_responses ?? [])
      .filter((r) => rewrite(r.checkpoint_id) !== null)
      .map((r) => {
        const next_id = rewrite(r.checkpoint_id);
        return next_id ? { ...r, checkpoint_id: next_id } : r;
      });

    const new_session_authorities = (prior_version.session_authorities ?? []).filter((auth) => {
      const res = resolution_map.get(auth.id);
      return !res || res.kind !== "discard";
    });

    const ts = this.now();
    const new_version_id = this.generateId();
    const new_version: ArgumentSessionVersion = {
      ...prior_version,
      id: new_version_id,
      session_id,
      parent_version_id: prior_version.id,
      created_at: ts,
      is_milestone: true,
      change_summary: `Migrated to frame v${target.version_number}`,
      premises: new_premises,
      argument_edges: new_arg_edges,
      checkpoint_responses: new_checkpoint_responses,
      session_authorities: new_session_authorities,
      // §8 #1: the new version is authored against the target frame.
      frame_version_snapshot: target,
    };
    // Point session at the new frame_version_id + snapshot.
    const next_session: ArgumentSession = {
      ...session,
      frame_version_id: target_frame_version_id,
      frame_version_snapshot: target,
      current_version_id: new_version_id,
      updated_at: ts,
    };
    await this.saveSession(next_session);
    await this.saveSessionVersion(new_version);
    return new_version;
  }

  async restoreFrameVersion(
    frame_id: FrameId,
    ancestor_version_id: FrameVersionId,
    change_summary?: string,
  ): Promise<FrameVersion> {
    const ancestor = await this.loadFrameVersion(ancestor_version_id);
    const existing = await this.listFrameVersionSummaries(frame_id);
    const max_version = existing.reduce((m, v) => Math.max(m, v.version_number), 0);
    const ts = this.now();
    const new_version: FrameVersion = {
      ...JSON.parse(JSON.stringify(ancestor)),
      id: this.generateId(),
      frame_id,
      version_number: max_version + 1,
      parent_version_id: ancestor.id,
      created_at: ts,
      is_milestone: true,
      change_summary: change_summary ?? `Restored from version ${ancestor.version_number}`,
    };
    await this.saveFrameVersion(new_version);
    return new_version;
  }

  async restoreSessionVersion(
    session_id: SessionId,
    ancestor_version_id: SessionVersionId,
    change_summary?: string,
  ): Promise<ArgumentSessionVersion> {
    const ancestor = await this.loadSessionVersion(ancestor_version_id);
    const session = await this.loadSession(session_id);
    const existing = await this.listSessionVersionSummaries(session_id);
    const max_version = existing.reduce((m, v) => Math.max(m, v.version_number), 0);
    const ts = this.now();
    const new_version: ArgumentSessionVersion = {
      ...JSON.parse(JSON.stringify(ancestor)),
      id: this.generateId(),
      session_id,
      version_number: max_version + 1,
      parent_version_id: ancestor.id,
      created_at: ts,
      is_milestone: true,
      change_summary: change_summary ?? `Restored from version ${ancestor.version_number}`,
      // §8 #1: restore replays the ancestor's premises into a new head that
      // lives in the *current* frame context — the live session's
      // frame_version_id is unchanged by restore. Snapshot today's frame.
      frame_version_snapshot: session.frame_version_snapshot,
    };
    await this.saveSessionVersion(new_version);
    return new_version;
  }

  // ----- App state -----

  async loadAppState(): Promise<AppState> {
    const { data, error } = await this.client
      .from("app_state")
      .select("payload")
      .eq("user_id", this.user_id)
      .maybeSingle();
    if (error) throw new RepositoryError("loadAppState", error.message, "network");
    // H-16: callers used to string-match the "AppState singleton missing"
    // message to decide whether to seed defaults. Branch on the typed code
    // instead so future message text edits don't silently break the
    // first-launch path.
    if (!data) {
      throw new RepositoryError("loadAppState", "AppState singleton missing", "app_state_missing");
    }
    return data.payload as AppState;
  }

  async saveAppState(state: AppState): Promise<void> {
    const { error } = await this.client.from("app_state").upsert({
      user_id: this.user_id,
      payload: state,
      updated_at: this.now(),
    });
    if (error) throw new RepositoryError("saveAppState", error.message);
  }

  // ----- Search -----

  async searchFrames(query: string): Promise<FrameSearchHit[]> {
    const q = query.trim();
    if (q.length === 0) return [];
    // Postgres `to_tsquery` with prefix matching: every token gets a `:*`.
    const ts_query = q
      .split(/\s+/g)
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/[^\w]/g, "") + ":*")
      .join(" & ");

    const { data, error } = await this.client
      .from("search_index")
      .select("frame_id, payload")
      .eq("user_id", this.user_id)
      .textSearch("tsv", ts_query, { type: "websearch" })
      .limit(50);
    if (error) {
      // H-14: previously swallowed as console.warn + empty array — a search
      // outage was indistinguishable from "zero hits" for the user. Throw
      // so the caller can surface "search unavailable" instead of "no
      // matches". Search is wired through repositories that already
      // tolerate exceptions in the existing UI; legacy callers that
      // intentionally want graceful degradation can wrap in try/catch.
      throw new RepositoryError("searchFrames", error.message, "network");
    }
    return (data ?? []).map((row): FrameSearchHit => {
      const p = row.payload as { title?: string; snippet?: string };
      return {
        frame_id: row.frame_id,
        title: p.title ?? "",
        hit_field: "title",
        snippet: p.snippet ?? "",
      };
    });
  }

  private async upsertSearchIndex(frame: Frame, version: FrameVersion): Promise<void> {
    // Build a minimal payload (title + first 200 chars of joined node text).
    const node_text = version.nodes
      .map((node) => {
        const n = node as unknown as Record<string, unknown>;
        const t =
          (typeof n["question"] === "string" && (n["question"] as string)) ||
          (typeof n["statement"] === "string" && (n["statement"] as string)) ||
          (typeof n["name"] === "string" && (n["name"] as string)) ||
          "";
        return t;
      })
      .filter((s) => s.length > 0)
      .join(" ");
    const snippet = node_text.slice(0, 200);
    const { error } = await this.client.from("search_index").upsert({
      frame_id: frame.id,
      user_id: this.user_id,
      payload: { title: frame.title, snippet },
      // tsv left null: searchFrames degrades gracefully (returns []). A
      // future migration can add a generated tsvector column for real
      // full-text search; v1 ships without it.
      tsv: null,
      updated_at: this.now(),
    });
    if (error) {
      console.warn("[SupabaseRepository.upsertSearchIndex]", error.message);
    }
  }

  // ----- Export / import -----

  async exportFrame(frame_id: FrameId, opts: { include_history: boolean }): Promise<FrameExport> {
    const frame = await this.loadFrame(frame_id);
    const current = await this.loadFrameVersion(frame.current_version_id);
    const history = opts.include_history ? await this.listFrameVersions(frame_id) : undefined;
    return {
      schema_version: 1,
      app_version: "1.0.0",
      exported_at: this.now(),
      frame,
      current_version: current,
      history,
    };
  }

  async exportSession(
    session_id: SessionId,
    opts: { include_frame: boolean; include_history: boolean },
  ): Promise<ArgumentSessionExport> {
    const session = await this.loadSession(session_id);
    const current = await this.loadSessionVersion(session.current_version_id);
    const history = opts.include_history ? await this.listSessionVersions(session_id) : undefined;
    const embedded_frame_export = opts.include_frame
      ? await this.exportFrame(session.frame_id, { include_history: false })
      : undefined;
    return {
      schema_version: 1,
      app_version: "1.0.0",
      exported_at: this.now(),
      session,
      current_version: current,
      history,
      embedded_frame_export,
    };
  }

  async importFrame(envelope: FrameExport): Promise<Frame> {
    const migrated = migrate(
      envelope as unknown as { schema_version: number } & Record<string, unknown>,
    ) as unknown as FrameExport;
    await this.saveFrame(migrated.frame);
    for (const v of [migrated.current_version, ...(migrated.history ?? [])]) {
      await this.saveFrameVersion(v);
    }
    return migrated.frame;
  }

  async importSession(envelope: ArgumentSessionExport): Promise<ArgumentSession> {
    const migrated = migrate(
      envelope as unknown as { schema_version: number } & Record<string, unknown>,
    ) as unknown as ArgumentSessionExport;
    if (migrated.embedded_frame_export) await this.importFrame(migrated.embedded_frame_export);
    await this.saveSession(migrated.session);
    for (const v of [migrated.current_version, ...(migrated.history ?? [])]) {
      await this.saveSessionVersion(v);
    }
    return migrated.session;
  }

  // ----- Prompts: stored in localStorage rather than Supabase (per-device cache) -----

  async loadPrompt(hook_name: string, version: string): Promise<PromptFileRecord | null> {
    try {
      const raw = localStorage.getItem(`argmap.prompt.${hook_name}.${version}`);
      return raw ? (JSON.parse(raw) as PromptFileRecord) : null;
    } catch {
      return null;
    }
  }

  async savePrompt(record: PromptFileRecord): Promise<void> {
    try {
      localStorage.setItem(
        `argmap.prompt.${record.hook_name}.${record.version}`,
        JSON.stringify(record),
      );
    } catch {
      // Storage may be unavailable; cache miss is acceptable.
    }
  }
}
