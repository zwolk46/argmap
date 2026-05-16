import { ArgmapDb, applySchemaMigrationSweep, type PromptFileRecord } from "./dexie-schema";
import {
  type Repository,
  type FrameSummary,
  type ArgumentSessionSummary,
  type FrameVersionSummary,
  type ArgumentSessionVersionSummary,
  type AppState,
  type FrameSearchHit,
  type OrphanResolution,
  QuotaExceededError,
  RepositoryError,
} from "./repository";
import { buildSearchIndexEntry, SearchIndex } from "./search-index";
import {
  migrate as schemaMigrate,
  runValidation,
  CURRENT_SCHEMA_VERSION,
  CURRENT_APP_VERSION,
  type Frame,
  type FrameVersion,
  type ArgumentSession,
  type ArgumentSessionVersion,
  type FrameExport,
  type ArgumentSessionExport,
  type FrameId,
  type FrameVersionId,
  type SessionId,
  type SessionVersionId,
  type NodeRef,
  type Mode,
  type Flavor,
  isLogicalGate,
  isCheckpoint,
  isTerm,
} from "@/schema";
import type { Table } from "dexie";

export interface IndexedDbRepositoryOptions {
  db_name?: string;
  now?: () => string;
  generateId?: () => string;
}

export class IndexedDbRepository implements Repository {
  private readonly db: ArgmapDb;
  private readonly now: () => string;
  private readonly generateId: () => string;
  private readonly search_cache: SearchIndex;

  constructor(opts: IndexedDbRepositoryOptions = {}) {
    this.db = new ArgmapDb(opts.db_name);
    this.now = opts.now ?? (() => new Date().toISOString());
    this.generateId = opts.generateId ?? (() => crypto.randomUUID());
    this.search_cache = new SearchIndex();
  }

  async openOrUpgrade(): Promise<void> {
    try {
      await this.db.open();
    } catch (e) {
      throw new RepositoryError("openOrUpgrade", (e as Error).message);
    }
    let app_state = await this.db.app_state.get("current");
    if (!app_state) {
      app_state = {
        key: "current",
        recents: [],
        pinned: [],
        default_output_view: "path_overlay",
        side_panel_collapsed: {},
        coachmark_dismissals: {},
        last_known_schema_version: CURRENT_SCHEMA_VERSION,
      } satisfies AppState & { key: "current" };
      await this.db.app_state.put(app_state);
    } else if (app_state.last_known_schema_version < CURRENT_SCHEMA_VERSION) {
      await applySchemaMigrationSweep(this.db, app_state.last_known_schema_version);
    }
    await this.search_cache.loadFromDb(this.db);
  }

  // ----- Frames -----

  async listFrames(): Promise<FrameSummary[]> {
    const all = await this.db.frames.toArray();
    return all.map((f) => this.toFrameSummary(f));
  }

  async loadFrame(frame_id: FrameId): Promise<Frame> {
    const f = await this.db.frames.get(frame_id);
    if (!f) throw new RepositoryError("loadFrame", `Frame not found: ${frame_id}`);
    return f;
  }

  async saveFrame(frame: Frame): Promise<void> {
    return this.runTx(
      "saveFrame",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
        await this.db.frames.put(frame);
        const current = await this.db.frame_versions.get(frame.current_version_id);
        if (current) {
          const entry = buildSearchIndexEntry(frame, current);
          await this.db.search_index.put(entry);
          this.search_cache.upsert(entry);
        }
      },
    );
  }

  async deleteFrame(frame_id: FrameId): Promise<void> {
    return this.runTx(
      "deleteFrame",
      "rw",
      [
        this.db.frames,
        this.db.frame_versions,
        this.db.argument_sessions,
        this.db.argument_session_versions,
        this.db.search_index,
      ],
      async () => {
        const versions = await this.db.frame_versions
          .where("frame_id")
          .equals(frame_id)
          .primaryKeys();
        const sessions = await this.db.argument_sessions
          .where("frame_id")
          .equals(frame_id)
          .primaryKeys();
        for (const sid of sessions as SessionId[]) {
          const svs = await this.db.argument_session_versions
            .where("session_id")
            .equals(sid)
            .primaryKeys();
          await this.db.argument_session_versions.bulkDelete(svs as SessionVersionId[]);
        }
        await this.db.argument_sessions.bulkDelete(sessions as SessionId[]);
        await this.db.frame_versions.bulkDelete(versions as FrameVersionId[]);
        await this.db.frames.delete(frame_id);
        await this.db.search_index.delete(frame_id);
        this.search_cache.remove(frame_id);
      },
    );
  }

  // ----- FrameVersions -----

  async listFrameVersions(frame_id: FrameId): Promise<FrameVersion[]> {
    return this.db.frame_versions
      .where("[frame_id+version_number]")
      .between([frame_id, 0], [frame_id, Infinity])
      .toArray();
  }

  async listFrameVersionSummaries(frame_id: FrameId): Promise<FrameVersionSummary[]> {
    const versions = await this.listFrameVersions(frame_id);
    return versions.map((v) => ({
      id: v.id,
      frame_id: v.frame_id,
      version_number: v.version_number,
      parent_version_id: v.parent_version_id,
      created_at: v.created_at,
      is_milestone: v.is_milestone,
      change_summary: v.change_summary,
    }));
  }

  async loadFrameVersion(version_id: FrameVersionId): Promise<FrameVersion> {
    const v = await this.db.frame_versions.get(version_id);
    if (!v) throw new RepositoryError("loadFrameVersion", `FrameVersion not found: ${version_id}`);
    return v;
  }

  async saveFrameVersion(version: FrameVersion): Promise<void> {
    return this.runTx(
      "saveFrameVersion",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
        const frame = await this.db.frames.get(version.frame_id);
        if (!frame) {
          throw new RepositoryError(
            "saveFrameVersion",
            `Parent Frame missing: ${version.frame_id}`,
          );
        }
        // P0-4: Re-chain parent_version_id and version_number against the
        // on-disk current version when this is a brand new id. Without this,
        // rapid edits inside the autosave debounce window each mint a fresh
        // in-memory chain (v1 → A → B → C) but only the last (C) reaches
        // disk; C.parent_version_id points at the in-memory B, which never
        // existed on disk. Traversing the chain (Compare view, restore)
        // then throws "FrameVersion not found." Re-stamping inside the
        // transaction guarantees: prior.id → next.parent_version_id and
        // prior.version_number + 1 → next.version_number.
        const existing = await this.db.frame_versions.get(version.id);
        let to_write: FrameVersion;
        if (existing) {
          // In-place update for an already-persisted id (e.g.,
          // restoreFrameVersion stamping a change_summary). Preserve chain.
          to_write = {
            ...version,
            parent_version_id: existing.parent_version_id,
            version_number: existing.version_number,
          };
        } else {
          const prior_id = frame.current_version_id;
          const prior = prior_id ? await this.db.frame_versions.get(prior_id) : undefined;
          if (prior && prior.id !== version.id) {
            to_write = {
              ...version,
              parent_version_id: prior.id,
              version_number: prior.version_number + 1,
            };
          } else {
            // First version on a frame that doesn't have one yet.
            to_write = { ...version, parent_version_id: undefined, version_number: 1 };
          }
        }
        await this.db.frame_versions.put(to_write);
        frame.current_version_id = to_write.id;
        frame.updated_at = this.now();
        await this.db.frames.put(frame);
        const entry = buildSearchIndexEntry(frame, to_write);
        await this.db.search_index.put(entry);
        this.search_cache.upsert(entry);
      },
    );
  }

  // ----- Argument sessions -----

  async listSessionsForFrame(frame_id: FrameId): Promise<ArgumentSessionSummary[]> {
    const sessions = await this.db.argument_sessions.where("frame_id").equals(frame_id).toArray();
    const frame = await this.db.frames.get(frame_id);
    // Filter archived sessions so the caller (Home / FrameBuilding "Run
    // argument") never silently navigates into an archived session. Mirrors
    // listFrames' archived filter.
    return sessions
      .filter((s) => !((s as { archived?: boolean }).archived ?? false))
      .map((s) => this.toSessionSummary(s, frame));
  }

  async loadSession(session_id: SessionId): Promise<ArgumentSession> {
    const s = await this.db.argument_sessions.get(session_id);
    if (!s) throw new RepositoryError("loadSession", `Session not found: ${session_id}`);
    return s;
  }

  async saveSession(session: ArgumentSession): Promise<void> {
    return this.runTx("saveSession", "rw", [this.db.argument_sessions], async () => {
      await this.db.argument_sessions.put(session);
    });
  }

  async deleteSession(session_id: SessionId): Promise<void> {
    return this.runTx(
      "deleteSession",
      "rw",
      [this.db.argument_sessions, this.db.argument_session_versions],
      async () => {
        const svs = await this.db.argument_session_versions
          .where("session_id")
          .equals(session_id)
          .primaryKeys();
        await this.db.argument_session_versions.bulkDelete(svs as SessionVersionId[]);
        await this.db.argument_sessions.delete(session_id);
      },
    );
  }

  async listSessionVersions(session_id: SessionId): Promise<ArgumentSessionVersion[]> {
    return this.db.argument_session_versions
      .where("[session_id+version_number]")
      .between([session_id, 0], [session_id, Infinity])
      .toArray();
  }

  async listSessionVersionSummaries(
    session_id: SessionId,
  ): Promise<ArgumentSessionVersionSummary[]> {
    const versions = await this.listSessionVersions(session_id);
    return versions.map((v) => ({
      id: v.id,
      session_id: v.session_id,
      version_number: v.version_number,
      parent_version_id: v.parent_version_id,
      created_at: v.created_at,
      is_milestone: v.is_milestone,
      change_summary: v.change_summary,
    }));
  }

  async loadSessionVersion(version_id: SessionVersionId): Promise<ArgumentSessionVersion> {
    const v = await this.db.argument_session_versions.get(version_id);
    if (!v)
      throw new RepositoryError(
        "loadSessionVersion",
        `ArgumentSessionVersion not found: ${version_id}`,
      );
    return v;
  }

  async saveSessionVersion(version: ArgumentSessionVersion): Promise<void> {
    return this.runTx(
      "saveSessionVersion",
      "rw",
      [this.db.argument_sessions, this.db.argument_session_versions],
      async () => {
        const session = await this.db.argument_sessions.get(version.session_id);
        if (!session) {
          throw new RepositoryError(
            "saveSessionVersion",
            `Parent ArgumentSession missing: ${version.session_id}`,
          );
        }
        // P0-4: same parent_version_id chain repair as saveFrameVersion above.
        const existing = await this.db.argument_session_versions.get(version.id);
        let to_write: ArgumentSessionVersion;
        if (existing) {
          to_write = {
            ...version,
            parent_version_id: existing.parent_version_id,
            version_number: existing.version_number,
          };
        } else {
          const prior_id = session.current_version_id;
          const prior = prior_id
            ? await this.db.argument_session_versions.get(prior_id)
            : undefined;
          if (prior && prior.id !== version.id) {
            to_write = {
              ...version,
              parent_version_id: prior.id,
              version_number: prior.version_number + 1,
            };
          } else {
            to_write = { ...version, parent_version_id: undefined, version_number: 1 };
          }
        }
        await this.db.argument_session_versions.put(to_write);
        session.current_version_id = to_write.id;
        session.updated_at = this.now();
        await this.db.argument_sessions.put(session);
      },
    );
  }

  // ----- Composite operations (Atomicity contracts §1–§4) -----

  async createBlankFrame(opts: {
    title: string;
    mode?: Mode;
    flavor?: Flavor;
  }): Promise<{ frame: Frame; version: FrameVersion }> {
    return this.runTx(
      "createBlankFrame",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
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

        await this.db.frame_versions.put(version);
        await this.db.frames.put(frame);
        const entry = buildSearchIndexEntry(frame, version);
        await this.db.search_index.put(entry);
        this.search_cache.upsert(entry);
        return { frame, version };
      },
    );
  }

  async createFrameFromTemplate(template_frame_id: FrameId, new_title: string): Promise<Frame> {
    return this.runTx(
      "createFrameFromTemplate",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
        const source_frame = await this.db.frames.get(template_frame_id);
        if (!source_frame) {
          throw new RepositoryError(
            "createFrameFromTemplate",
            `Template Frame not found: ${template_frame_id}`,
          );
        }
        const source_version = await this.db.frame_versions.get(source_frame.current_version_id);
        if (!source_version) {
          throw new RepositoryError(
            "createFrameFromTemplate",
            `Template FrameVersion not found: ${source_frame.current_version_id}`,
          );
        }

        // Build id translation maps.
        const node_id_map = new Map<NodeRef, NodeRef>();
        for (const node of source_version.nodes) {
          node_id_map.set(node.id, this.generateId());
        }
        const edge_id_map = new Map<string, string>();
        for (const edge of source_version.edges) {
          edge_id_map.set(edge.id, this.generateId());
        }

        const translate = (ref: NodeRef | undefined): NodeRef | undefined => {
          if (!ref) return undefined;
          return node_id_map.get(ref) ?? ref;
        };

        // Deep-copy nodes with rewritten internal references.
        const new_nodes = source_version.nodes.map((node) => {
          const n = JSON.parse(JSON.stringify(node)) as typeof node;
          n.id = node_id_map.get(node.id) ?? node.id;
          if (isCheckpoint(n)) {
            n.options = n.options.map((opt) => ({
              ...opt,
              target_node_id: opt.target_node_id
                ? (node_id_map.get(opt.target_node_id) ?? opt.target_node_id)
                : undefined,
            }));
          } else if (isLogicalGate(n)) {
            if (n.output_target) {
              n.output_target = translate(n.output_target);
            }
            if (n.gate_type === "AND" || n.gate_type === "OR") {
              n.inputs = n.inputs.map((inp) => node_id_map.get(inp) ?? inp);
            } else if (n.gate_type === "NOT") {
              n.input = node_id_map.get(n.input) ?? n.input;
            } else if (n.gate_type === "IF_THEN") {
              n.antecedent = node_id_map.get(n.antecedent) ?? n.antecedent;
              n.consequent = node_id_map.get(n.consequent) ?? n.consequent;
            } else if (n.gate_type === "UNLESS") {
              n.main = node_id_map.get(n.main) ?? n.main;
              n.exception = node_id_map.get(n.exception) ?? n.exception;
            }
          } else if (isTerm(n)) {
            if (n.linked_to) {
              n.linked_to = node_id_map.get(n.linked_to) ?? n.linked_to;
            }
          }
          return n;
        });

        // Deep-copy edges with rewritten source/target.
        const new_edges = source_version.edges.map((edge) => {
          const e = JSON.parse(JSON.stringify(edge)) as typeof edge;
          e.id = edge_id_map.get(edge.id) ?? edge.id;
          e.source = node_id_map.get(e.source) ?? e.source;
          e.target = node_id_map.get(e.target) ?? e.target;
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
          change_summary: `Created from template: ${source_frame.title}`,
          nodes: new_nodes,
          edges: new_edges,
        };

        const new_frame: Frame = {
          ...(JSON.parse(JSON.stringify(source_frame)) as Frame),
          id: new_frame_id,
          title: new_title,
          current_version_id: new_version_id,
          created_at: ts,
          updated_at: ts,
          llm_settings: source_frame.llm_settings
            ? { ...source_frame.llm_settings, invocations: [] }
            : undefined,
        };

        await this.db.frame_versions.put(new_version);
        await this.db.frames.put(new_frame);
        const entry = buildSearchIndexEntry(new_frame, new_version);
        await this.db.search_index.put(entry);
        this.search_cache.upsert(entry);
        return new_frame;
      },
    );
  }

  async migrateSession(
    session_id: SessionId,
    target_frame_version_id: FrameVersionId,
    orphan_resolutions: OrphanResolution[],
  ): Promise<ArgumentSessionVersion> {
    return this.runTx(
      "migrateSession",
      "rw",
      [this.db.argument_sessions, this.db.argument_session_versions, this.db.frame_versions],
      async () => {
        const session = await this.db.argument_sessions.get(session_id);
        if (!session) {
          throw new RepositoryError("migrateSession", `Session not found: ${session_id}`);
        }
        const prior_version = await this.db.argument_session_versions.get(
          session.current_version_id,
        );
        if (!prior_version) {
          throw new RepositoryError(
            "migrateSession",
            `Current session version not found: ${session.current_version_id}`,
          );
        }
        const target_version = await this.db.frame_versions.get(target_frame_version_id);
        if (!target_version) {
          throw new RepositoryError(
            "migrateSession",
            `Target FrameVersion not found: ${target_frame_version_id}`,
          );
        }

        // Build resolution map: source_node_id → resolution
        const resolution_map = new Map<NodeRef, OrphanResolution>();
        for (const res of orphan_resolutions) {
          if (res.source_node_id) resolution_map.set(res.source_node_id, res);
        }

        // Rewrite fn: given a NodeRef, apply orphan resolution.
        const rewrite = (ref: NodeRef): NodeRef | null => {
          const res = resolution_map.get(ref);
          if (!res) return ref;
          if (res.kind === "discard") return null;
          if (res.kind === "reattach" && res.target_node_id) return res.target_node_id;
          return ref; // no_op
        };

        // Apply resolutions to argument-layer collections.
        const new_premises = (prior_version.premises ?? [])
          .filter((p) => {
            const res = resolution_map.get(p.id);
            return !res || res.kind !== "discard";
          })
          .map((p) => {
            const res = resolution_map.get(p.id);
            if (res?.kind === "reattach" && res.target_node_id) {
              return { ...p, id: res.target_node_id };
            }
            return p;
          });

        const new_arg_edges = (prior_version.argument_edges ?? [])
          .filter((e) => {
            const src = rewrite(e.source);
            const tgt = rewrite(e.target);
            return src !== null && tgt !== null;
          })
          .map((e) => {
            const src = rewrite(e.source);
            const tgt = rewrite(e.target);
            return { ...e, source: src!, target: tgt! };
          });

        const new_checkpoint_responses = (prior_version.checkpoint_responses ?? [])
          .filter((r) => {
            return rewrite(r.checkpoint_id) !== null;
          })
          .map((r) => {
            const new_id = rewrite(r.checkpoint_id);
            return new_id ? { ...r, checkpoint_id: new_id } : r;
          });

        const new_session_authorities = (prior_version.session_authorities ?? []).filter((auth) => {
          const res = resolution_map.get(auth.id);
          return !res || res.kind !== "discard";
        });

        const new_interpretation_selections = (prior_version.interpretation_selections ?? [])
          .filter((s) => {
            return rewrite(s.term_id) !== null;
          })
          .map((s) => {
            const new_term_id = rewrite(s.term_id);
            return new_term_id ? { ...s, term_id: new_term_id } : s;
          });

        // Compute next version_number.
        const existing_versions = await this.db.argument_session_versions
          .where("session_id")
          .equals(session_id)
          .toArray();
        const max_version = existing_versions.reduce(
          (max, v) => Math.max(max, v.version_number),
          0,
        );

        const ts = this.now();
        const new_version_id = this.generateId();

        const new_session_version: ArgumentSessionVersion = {
          id: new_version_id,
          session_id,
          version_number: max_version + 1,
          parent_version_id: prior_version.id,
          created_at: ts,
          is_milestone: true,
          change_summary: `Migrated to frame v${target_version.version_number}`,
          premises: new_premises,
          argument_edges: new_arg_edges,
          checkpoint_responses: new_checkpoint_responses,
          session_authorities: new_session_authorities,
          interpretation_selections: new_interpretation_selections,
        };

        session.current_version_id = new_version_id;
        session.frame_version_id = target_frame_version_id;
        session.frame_version_snapshot = JSON.parse(JSON.stringify(target_version)) as FrameVersion;
        session.updated_at = ts;

        await this.db.argument_session_versions.put(new_session_version);
        await this.db.argument_sessions.put(session);
        return new_session_version;
      },
    );
  }

  async restoreFrameVersion(
    frame_id: FrameId,
    ancestor_version_id: FrameVersionId,
    change_summary?: string,
  ): Promise<FrameVersion> {
    return this.runTx(
      "restoreFrameVersion",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
        const frame = await this.db.frames.get(frame_id);
        if (!frame) {
          throw new RepositoryError("restoreFrameVersion", `Frame not found: ${frame_id}`);
        }
        const ancestor = await this.db.frame_versions.get(ancestor_version_id);
        if (!ancestor) {
          throw new RepositoryError(
            "restoreFrameVersion",
            `Ancestor FrameVersion not found: ${ancestor_version_id}`,
          );
        }

        const existing = await this.db.frame_versions.where("frame_id").equals(frame_id).toArray();
        const max_version = existing.reduce((max, v) => Math.max(max, v.version_number), 0);

        const ts = this.now();
        const new_version_id = this.generateId();

        const new_version: FrameVersion = {
          ...(JSON.parse(JSON.stringify(ancestor)) as FrameVersion),
          id: new_version_id,
          frame_id,
          version_number: max_version + 1,
          parent_version_id: ancestor.id,
          created_at: ts,
          is_milestone: true,
          change_summary: change_summary ?? `Restored from version ${ancestor.version_number}`,
        };

        frame.current_version_id = new_version_id;
        frame.updated_at = ts;

        await this.db.frame_versions.put(new_version);
        await this.db.frames.put(frame);
        const entry = buildSearchIndexEntry(frame, new_version);
        await this.db.search_index.put(entry);
        this.search_cache.upsert(entry);
        return new_version;
      },
    );
  }

  async restoreSessionVersion(
    session_id: SessionId,
    ancestor_version_id: SessionVersionId,
    change_summary?: string,
  ): Promise<ArgumentSessionVersion> {
    return this.runTx(
      "restoreSessionVersion",
      "rw",
      [this.db.argument_sessions, this.db.argument_session_versions],
      async () => {
        const session = await this.db.argument_sessions.get(session_id);
        if (!session) {
          throw new RepositoryError("restoreSessionVersion", `Session not found: ${session_id}`);
        }
        const ancestor = await this.db.argument_session_versions.get(ancestor_version_id);
        if (!ancestor) {
          throw new RepositoryError(
            "restoreSessionVersion",
            `Ancestor ArgumentSessionVersion not found: ${ancestor_version_id}`,
          );
        }

        const existing = await this.db.argument_session_versions
          .where("session_id")
          .equals(session_id)
          .toArray();
        const max_version = existing.reduce((max, v) => Math.max(max, v.version_number), 0);

        const ts = this.now();
        const new_version_id = this.generateId();

        const new_version: ArgumentSessionVersion = {
          ...(JSON.parse(JSON.stringify(ancestor)) as ArgumentSessionVersion),
          id: new_version_id,
          session_id,
          version_number: max_version + 1,
          parent_version_id: ancestor.id,
          created_at: ts,
          is_milestone: true,
          change_summary: change_summary ?? `Restored from version ${ancestor.version_number}`,
        };

        session.current_version_id = new_version_id;
        session.updated_at = ts;

        await this.db.argument_session_versions.put(new_version);
        await this.db.argument_sessions.put(session);
        return new_version;
      },
    );
  }

  // ----- App state -----

  async loadAppState(): Promise<AppState> {
    const s = await this.db.app_state.get("current");
    if (!s) throw new RepositoryError("loadAppState", "AppState singleton missing");
    const { key: _key, ...rest } = s;
    return rest;
  }

  async saveAppState(state: AppState): Promise<void> {
    return this.runTx("saveAppState", "rw", [this.db.app_state], async () => {
      await this.db.app_state.put({ ...state, key: "current" });
    });
  }

  // ----- Search -----

  async searchFrames(query: string): Promise<FrameSearchHit[]> {
    return this.search_cache.query(query);
  }

  // ----- Export / import -----

  async exportFrame(frame_id: FrameId, opts: { include_history: boolean }): Promise<FrameExport> {
    const frame = await this.loadFrame(frame_id);
    const current = await this.loadFrameVersion(frame.current_version_id);
    const history = opts.include_history ? await this.listFrameVersions(frame_id) : undefined;
    return {
      schema_version: CURRENT_SCHEMA_VERSION,
      app_version: CURRENT_APP_VERSION,
      exported_at: this.now(),
      frame,
      current_version: current,
      ...(history ? { history } : {}),
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
      schema_version: CURRENT_SCHEMA_VERSION,
      app_version: CURRENT_APP_VERSION,
      exported_at: this.now(),
      session,
      current_version: current,
      ...(history ? { history } : {}),
      ...(embedded_frame_export ? { embedded_frame_export } : {}),
    };
  }

  async importFrame(envelope: FrameExport): Promise<Frame> {
    const migrated = schemaMigrate(
      envelope as unknown as { schema_version: number } & Record<string, unknown>,
    ) as FrameExport;
    const validation = runValidation(migrated.current_version);
    const errors = validation.filter((r) => r.severity === "error");
    if (errors.length > 0) {
      throw new RepositoryError(
        "importFrame",
        `Validation failed: ${errors.map((e) => e.rule_id).join(", ")}`,
      );
    }
    return this.runTx(
      "importFrame",
      "rw",
      [this.db.frames, this.db.frame_versions, this.db.search_index],
      async () => {
        await this.db.frame_versions.put(migrated.current_version);
        if (migrated.history) {
          await this.db.frame_versions.bulkPut(migrated.history);
        }
        await this.db.frames.put(migrated.frame);
        const entry = buildSearchIndexEntry(migrated.frame, migrated.current_version);
        await this.db.search_index.put(entry);
        this.search_cache.upsert(entry);
        return migrated.frame;
      },
    );
  }

  async importSession(envelope: ArgumentSessionExport): Promise<ArgumentSession> {
    const migrated = schemaMigrate(
      envelope as unknown as { schema_version: number } & Record<string, unknown>,
    ) as ArgumentSessionExport;
    return this.runTx(
      "importSession",
      "rw",
      [
        this.db.argument_sessions,
        this.db.argument_session_versions,
        this.db.frames,
        this.db.frame_versions,
        this.db.search_index,
      ],
      async () => {
        if (migrated.embedded_frame_export) {
          await this.importFrameInTx(migrated.embedded_frame_export);
        }
        await this.db.argument_session_versions.put(migrated.current_version);
        if (migrated.history) {
          await this.db.argument_session_versions.bulkPut(migrated.history);
        }
        await this.db.argument_sessions.put(migrated.session);
        return migrated.session;
      },
    );
  }

  // ----- Internals -----

  private async importFrameInTx(envelope: FrameExport): Promise<void> {
    await this.db.frame_versions.put(envelope.current_version);
    if (envelope.history) {
      await this.db.frame_versions.bulkPut(envelope.history);
    }
    await this.db.frames.put(envelope.frame);
    const entry = buildSearchIndexEntry(envelope.frame, envelope.current_version);
    await this.db.search_index.put(entry);
    this.search_cache.upsert(entry);
  }

  private toFrameSummary(f: Frame): FrameSummary {
    return {
      id: f.id,
      title: f.title,
      mode: f.mode,
      flavor: f.flavor,
      tags: f.tags,
      pinned: f.pinned,
      updated_at: f.updated_at,
      last_opened_at: f.last_opened_at,
      current_version_id: f.current_version_id,
    };
  }

  private toSessionSummary(
    s: ArgumentSession,
    parent_frame: Frame | undefined,
  ): ArgumentSessionSummary {
    const drift_warning =
      parent_frame && parent_frame.current_version_id !== s.frame_version_id
        ? `Frame has moved forward since this session was active (frame v${parent_frame.current_version_id.slice(0, 8)} vs session v${s.frame_version_id.slice(0, 8)}).`
        : undefined;
    return {
      id: s.id,
      frame_id: s.frame_id,
      title: s.title ?? "Untitled session",
      updated_at: s.updated_at,
      current_version_id: s.current_version_id,
      ...(drift_warning ? { frame_version_drift_warning: drift_warning } : {}),
    };
  }

  private async runTx<T>(
    op: string,
    mode: "r" | "rw",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tables: Table<any, any>[],
    body: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.db.transaction(mode, tables, body);
    } catch (e) {
      const err = e as Error & { name?: string };
      if (
        err.name === "QuotaExceededError" ||
        (err.name === "AbortError" && /quota/i.test(err.message ?? ""))
      ) {
        throw new QuotaExceededError(err.message);
      }
      if (err instanceof QuotaExceededError || err instanceof RepositoryError) {
        throw err;
      }
      throw new RepositoryError(op, err.message);
    }
  }

  async loadPrompt(hook_name: string, version: string): Promise<PromptFileRecord | null> {
    return (await this.db.prompts.get([hook_name, version])) ?? null;
  }

  async savePrompt(record: PromptFileRecord): Promise<void> {
    await this.db.prompts.put(record);
  }

  close(): void {
    this.db.close();
  }
}
