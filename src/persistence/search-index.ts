import { ArgmapDb, type SearchIndexEntry } from "./dexie-schema";
import { type FrameSearchHit } from "./repository";
import { type Frame, type FrameVersion, type FrameId } from "@/schema";

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function buildSearchIndexEntry(frame: Frame, current: FrameVersion): SearchIndexEntry {
  const tokens = new Set<string>();
  const token_fields: { [token: string]: Array<FrameSearchHit["hit_field"]> } = {};

  const add = (text: string | undefined, field: FrameSearchHit["hit_field"]): void => {
    if (!text) return;
    for (const t of tokenize(text)) {
      tokens.add(t);
      const list = token_fields[t] ?? [];
      if (!list.includes(field)) list.push(field);
      token_fields[t] = list;
    }
  };

  add(frame.title, "title");
  add(frame.description, "description");
  for (const tag of frame.tags) add(tag, "tag");

  for (const node of current.nodes) {
    switch (node.type) {
      case "RootQuestion":
      case "SubQuestion":
      case "Interpretation":
        add(node.statement, "node_text");
        break;
      case "Term":
        add(node.name, "node_text");
        break;
      case "Checkpoint":
        add(node.question, "node_text");
        break;
      case "Conclusion":
        add(node.statement, "conclusion_statement");
        if (node.reasoning_summary) add(node.reasoning_summary, "node_text");
        break;
      case "Authority":
        add(node.citation, "node_text");
        break;
      case "Premise":
        // Premise is an argument-layer node; unreachable on FrameVersion.nodes.
        break;
      case "LogicalGate":
        // Gates carry no user text.
        break;
    }
    if (node.notes) add(node.notes, "node_text");
  }

  return {
    frame_id: frame.id,
    tokens: Array.from(tokens).sort(),
    token_fields,
    title: frame.title,
    built_at: frame.updated_at,
  };
}

export class SearchIndex {
  private entries = new Map<FrameId, SearchIndexEntry>();
  private token_to_frames = new Map<string, Set<FrameId>>();

  async loadFromDb(db: ArgmapDb): Promise<void> {
    this.entries.clear();
    this.token_to_frames.clear();
    const all = await db.search_index.toArray();
    for (const entry of all) this.upsert(entry);
  }

  upsert(entry: SearchIndexEntry): void {
    const previous = this.entries.get(entry.frame_id);
    if (previous) {
      for (const t of previous.tokens) {
        this.token_to_frames.get(t)?.delete(entry.frame_id);
      }
    }
    this.entries.set(entry.frame_id, entry);
    for (const t of entry.tokens) {
      const set = this.token_to_frames.get(t) ?? new Set<FrameId>();
      set.add(entry.frame_id);
      this.token_to_frames.set(t, set);
    }
  }

  remove(frame_id: FrameId): void {
    const previous = this.entries.get(frame_id);
    if (!previous) return;
    for (const t of previous.tokens) {
      this.token_to_frames.get(t)?.delete(frame_id);
    }
    this.entries.delete(frame_id);
  }

  query(raw_query: string): FrameSearchHit[] {
    const query_tokens = tokenize(raw_query);
    if (query_tokens.length === 0) return [];
    let candidates: Set<FrameId> | null = null;
    for (const qt of query_tokens) {
      const frames = this.token_to_frames.get(qt) ?? new Set<FrameId>();
      if (candidates === null) candidates = new Set(frames);
      else
        for (const id of Array.from(candidates)) {
          if (!frames.has(id)) candidates.delete(id);
        }
      if (candidates.size === 0) return [];
    }
    const hits: FrameSearchHit[] = [];
    for (const frame_id of Array.from(candidates ?? new Set<FrameId>()).sort()) {
      const entry = this.entries.get(frame_id);
      if (!entry) continue;
      const priority: Array<FrameSearchHit["hit_field"]> = [
        "title",
        "conclusion_statement",
        "tag",
        "node_text",
        "description",
      ];
      let chosen: FrameSearchHit["hit_field"] = "title";
      outer: for (const field of priority) {
        for (const qt of query_tokens) {
          if (entry.token_fields[qt]?.includes(field)) {
            chosen = field;
            break outer;
          }
        }
      }
      hits.push({
        frame_id,
        title: entry.title,
        hit_field: chosen,
        snippet: this.buildSnippet(entry, query_tokens),
      });
    }
    return hits;
  }

  private buildSnippet(entry: SearchIndexEntry, query_tokens: string[]): string {
    const matched = query_tokens.filter((qt) => entry.tokens.includes(qt));
    return matched.slice(0, 6).join(" · ");
  }
}
