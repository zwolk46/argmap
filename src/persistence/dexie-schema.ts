import Dexie, { type Table } from "dexie";
import {
  migrate as schemaMigrate,
  CURRENT_SCHEMA_VERSION,
  type Frame,
  type FrameVersion,
  type ArgumentSession,
  type ArgumentSessionVersion,
  type FrameId,
  type FrameVersionId,
  type SessionId,
  type SessionVersionId,
} from "@/schema";
import type { FrameSearchHit, AppState } from "./repository";

export const DEXIE_DB_NAME = "argmap_v1";

export const CURRENT_DEXIE_VERSION = 1;

export interface SearchIndexEntry {
  frame_id: FrameId;
  tokens: string[];
  token_fields: { [token: string]: Array<FrameSearchHit["hit_field"]> };
  title: string;
  built_at: string;
}

export interface PromptFileRecord {
  hook_name: string;
  version: string;
  body_markdown: string;
  frontmatter: { [k: string]: unknown };
  added_at: string;
}

export class ArgmapDb extends Dexie {
  frames!: Table<Frame, FrameId>;
  frame_versions!: Table<FrameVersion, FrameVersionId>;
  argument_sessions!: Table<ArgumentSession, SessionId>;
  argument_session_versions!: Table<ArgumentSessionVersion, SessionVersionId>;
  app_state!: Table<AppState & { key: "current" }, string>;
  search_index!: Table<SearchIndexEntry, FrameId>;
  prompts!: Table<PromptFileRecord, [string, string]>;

  constructor(db_name: string = DEXIE_DB_NAME) {
    super(db_name);

    this.version(1).stores({
      frames: "id, updated_at, last_opened_at, pinned, *tags",
      frame_versions: "id, frame_id, [frame_id+version_number], parent_version_id",
      argument_sessions: "id, frame_id, updated_at",
      argument_session_versions: "id, session_id, [session_id+version_number], parent_version_id",
      app_state: "key",
      search_index: "frame_id",
      prompts: "[hook_name+version], hook_name",
    });
  }
}

export async function applySchemaMigrationSweep(db: ArgmapDb, from_version: number): Promise<void> {
  if (from_version === CURRENT_SCHEMA_VERSION) return;
  await db.transaction(
    "rw",
    [
      db.frames,
      db.frame_versions,
      db.argument_sessions,
      db.argument_session_versions,
      db.app_state,
    ],
    async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores: Array<Table<any, any>> = [
        db.frames,
        db.frame_versions,
        db.argument_sessions,
        db.argument_session_versions,
      ];
      for (const store of stores) {
        const records = await store.toArray();
        for (const record of records) {
          const envelope = { schema_version: from_version, payload: record };
          const migrated = schemaMigrate(
            envelope as { schema_version: number } & Record<string, unknown>,
          );
          const next = (migrated as { payload?: unknown }).payload ?? migrated;
          await store.put(next as never);
        }
      }
      const app_state = (await db.app_state.get("current")) ?? null;
      if (app_state) {
        app_state.last_known_schema_version = CURRENT_SCHEMA_VERSION;
        await db.app_state.put(app_state);
      }
    },
  );
}
