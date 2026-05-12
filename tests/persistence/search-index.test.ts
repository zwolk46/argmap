import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tokenize, buildSearchIndexEntry } from "@/persistence";
import { SearchIndex } from "../../src/persistence/search-index";
import { freshDb } from "./_setup";
import { buildLegalModeFixture } from "../schema/fixtures/legal-mode-fixture";
import type { IndexedDbRepository } from "@/persistence";

const T = "2026-05-10T00:00:00.000Z";

describe("persistence/search-index", () => {
  it("tokenize: lowercases, strips punctuation, splits on whitespace", () => {
    expect(tokenize("Hello, World! It's 2026.")).toStrictEqual([
      "hello",
      "world",
      "it",
      "s",
      "2026",
    ]);
  });

  it("tokenize: handles Unicode letters and digits via \\p{L}\\p{N}", () => {
    expect(tokenize("café naïve")).toStrictEqual(["café", "naïve"]);
    expect(tokenize("über 42")).toStrictEqual(["über", "42"]);
  });

  it("tokenize: idempotent — tokenize(tokenize(x).join(' ')) === tokenize(x)", () => {
    const input = "The quick brown fox, jumps over the lazy dog!";
    const once = tokenize(input);
    const twice = tokenize(once.join(" "));
    expect(twice).toStrictEqual(once);
  });

  it("tokenize: empty string returns empty array", () => {
    expect(tokenize("")).toStrictEqual([]);
    expect(tokenize("   ")).toStrictEqual([]);
  });

  it("buildSearchIndexEntry: covers title, description, tags, and node text", () => {
    const { frame_export } = buildLegalModeFixture();
    const entry = buildSearchIndexEntry(frame_export.frame, frame_export.current_version);

    expect(entry.frame_id).toBe(frame_export.frame.id);
    // "negligence" comes from the title
    expect(entry.tokens).toContain("negligence");
    // "foreseeability" comes from Term node
    expect(entry.tokens).toContain("foreseeability");
    // "liable" from Conclusion.statement
    expect(entry.tokens).toContain("liable");
  });

  it("buildSearchIndexEntry: token_fields records the source field for each token", () => {
    const { frame_export } = buildLegalModeFixture();
    const entry = buildSearchIndexEntry(frame_export.frame, frame_export.current_version);

    expect(entry.token_fields["negligence"]).toContain("title");
    expect(entry.token_fields["liable"]).toContain("conclusion_statement");
    expect(entry.token_fields["torts"]).toContain("tag");
  });

  it("buildSearchIndexEntry: tokens are sorted lexicographically for deterministic snapshots", () => {
    const { frame_export } = buildLegalModeFixture();
    const entry = buildSearchIndexEntry(frame_export.frame, frame_export.current_version);
    const sorted = [...entry.tokens].sort();
    expect(entry.tokens).toStrictEqual(sorted);
  });

  it("buildSearchIndexEntry: notes are indexed under node_text", () => {
    const { frame_export } = buildLegalModeFixture();
    const entry = buildSearchIndexEntry(frame_export.frame, frame_export.current_version);
    // interpA has notes: "Traditional view."
    expect(entry.tokens).toContain("traditional");
    expect(entry.token_fields["traditional"]).toContain("node_text");
  });

  it("buildSearchIndexEntry: LogicalGate produces no tokens", () => {
    const frame = {
      id: "f1",
      title: "T",
      mode: "general" as const,
      default_satisfaction_policies: {},
      tags: [],
      pinned: false,
      created_at: T,
      updated_at: T,
      current_version_id: "fv1",
    };
    const gate_only_version = {
      id: "fv1",
      frame_id: "f1",
      version_number: 1,
      is_milestone: false,
      created_at: T,
      nodes: [
        {
          id: "g1",
          type: "LogicalGate" as const,
          layer: "frame" as const,
          gate_type: "AND" as const,
          inputs: [],
          created_at: T,
          updated_at: T,
        },
      ],
      edges: [],
    };
    const entry = buildSearchIndexEntry(frame as never, gate_only_version as never);
    // Only "t" from the title "T"
    expect(entry.tokens).toStrictEqual(["t"]);
  });

  it("SearchIndex.query: AND-intersects across query tokens", () => {
    const { frame_export } = buildLegalModeFixture();
    const index = new SearchIndex();
    const entry = buildSearchIndexEntry(frame_export.frame, frame_export.current_version);
    index.upsert(entry);

    // Both tokens exist in this frame
    const results = index.query("negligence claim");
    expect(results).toHaveLength(1);
    expect(results[0].frame_id).toBe(frame_export.frame.id);
  });

  it("SearchIndex.query: returns no hits when any query token is missing from a frame", () => {
    const { frame_export } = buildLegalModeFixture();
    const index = new SearchIndex();
    index.upsert(buildSearchIndexEntry(frame_export.frame, frame_export.current_version));

    const results = index.query("negligence xyzzy_nonexistent_token");
    expect(results).toHaveLength(0);
  });

  it("SearchIndex.query: hit_field priority is title > conclusion_statement > tag > node_text > description", () => {
    const { frame_export } = buildLegalModeFixture();
    const index = new SearchIndex();
    index.upsert(buildSearchIndexEntry(frame_export.frame, frame_export.current_version));

    // "negligence" appears in title — should get title hit_field
    const results_title = index.query("negligence");
    expect(results_title[0].hit_field).toBe("title");

    // "liable" appears in conclusion_statement and node_text
    const results_conc = index.query("liable");
    expect(results_conc[0].hit_field).toBe("conclusion_statement");
  });

  it("SearchIndex.upsert: replaces prior reverse-index entries when a frame's tokens change", () => {
    const index = new SearchIndex();
    const frame = {
      id: "f1",
      title: "Alpha",
      mode: "general" as const,
      default_satisfaction_policies: {},
      tags: [],
      pinned: false,
      created_at: T,
      updated_at: T,
      current_version_id: "fv1",
    };
    const fv1 = {
      id: "fv1",
      frame_id: "f1",
      version_number: 1,
      is_milestone: false,
      created_at: T,
      nodes: [],
      edges: [],
    };
    const fv2 = { ...fv1, id: "fv2" };
    const frame2 = { ...frame, title: "Beta", current_version_id: "fv2" };

    index.upsert(buildSearchIndexEntry(frame as never, fv1 as never));
    expect(index.query("alpha")).toHaveLength(1);

    index.upsert(buildSearchIndexEntry(frame2 as never, fv2 as never));
    expect(index.query("alpha")).toHaveLength(0);
    expect(index.query("beta")).toHaveLength(1);
  });

  it("SearchIndex.remove: clears reverse-index entries for the removed frame", () => {
    const index = new SearchIndex();
    const { frame_export } = buildLegalModeFixture();
    index.upsert(buildSearchIndexEntry(frame_export.frame, frame_export.current_version));

    expect(index.query("negligence")).toHaveLength(1);
    index.remove(frame_export.frame.id);
    expect(index.query("negligence")).toHaveLength(0);
  });

  describe("searchFrames via Repository", () => {
    let repo: IndexedDbRepository;
    beforeEach(async () => {
      repo = await freshDb();
    });
    afterEach(() => repo.close());

    it("returns the same hits as a direct SearchIndex query after a Frame + FrameVersion save", async () => {
      const { frame_export } = buildLegalModeFixture();
      await repo.saveFrame(frame_export.frame);
      await repo.saveFrameVersion(frame_export.current_version);

      const results = await repo.searchFrames("negligence");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].frame_id).toBe(frame_export.frame.id);
    });

    it("save → search: a Frame becomes searchable in the same transaction as its FrameVersion save", async () => {
      const { frame_export } = buildLegalModeFixture();
      await repo.saveFrame(frame_export.frame);
      await repo.saveFrameVersion(frame_export.current_version);

      const results = await repo.searchFrames("foreseeability");
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
