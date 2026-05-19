import { describe, it, expect } from "vitest";
import {
  buildArgumentOverlayFromSessionVersion,
  pickFrameForSessionPreview,
} from "@/ui/version-history/session-preview-view";
import type { ArgumentSessionVersion, FrameVersion } from "@/schema";

function mk(edges: Array<{ id: string; type: string; source: string; target: string }>) {
  return {
    id: "sv",
    session_id: "s",
    version_number: 1,
    created_at: "",
    is_milestone: false,
    premises: [],
    argument_edges: edges,
    checkpoint_responses: [],
    interpretation_selections: [],
    session_authorities: [],
  } as unknown as ArgumentSessionVersion;
}

function mkFrameVersion(id: string, version_number: number): FrameVersion {
  return {
    id,
    frame_id: "fr-1",
    version_number,
    created_at: "",
    nodes: [],
    edges: [],
    is_milestone: false,
  };
}

function mkSessionVersion(snapshot: FrameVersion | undefined): ArgumentSessionVersion {
  return {
    id: "sv-1",
    session_id: "s-1",
    version_number: 1,
    created_at: "",
    is_milestone: false,
    premises: [],
    argument_edges: [],
    checkpoint_responses: [],
    interpretation_selections: [],
    frame_version_snapshot: snapshot,
  };
}

describe("buildArgumentOverlayFromSessionVersion", () => {
  it("returns empty overlay for null input", () => {
    expect(buildArgumentOverlayFromSessionVersion(null)).toEqual({ edges: [] });
  });

  it("includes only ANSWERS/SUPPORTS/CONTRADICTS edges", () => {
    const v = mk([
      { id: "e1", type: "ANSWERS", source: "a", target: "b" },
      { id: "e2", type: "SUPPORTS", source: "c", target: "d" },
      { id: "e3", type: "CITES", source: "e", target: "f" },
      { id: "e4", type: "CONTRADICTS", source: "g", target: "h" },
    ]);
    const out = buildArgumentOverlayFromSessionVersion(v);
    expect(out.edges.map((e) => e.id).sort()).toEqual(["e1", "e2", "e4"]);
  });

  it("sorts overlay edges by id ascending (deterministic)", () => {
    const v = mk([
      { id: "z", type: "SUPPORTS", source: "x", target: "y" },
      { id: "a", type: "SUPPORTS", source: "x", target: "y" },
      { id: "m", type: "SUPPORTS", source: "x", target: "y" },
    ]);
    const out = buildArgumentOverlayFromSessionVersion(v);
    expect(out.edges.map((e) => e.id)).toEqual(["a", "m", "z"]);
  });
});

// §8 #1: the consumer prefers the session-version's own snapshot, even when
// the live session has migrated to a different frame_version. Without this
// precedence, replaying the same version_id shows different visual output
// after a migration — the visual lie the audit flagged.
describe("pickFrameForSessionPreview (§8 #1)", () => {
  it("prefers the session-version's snapshot over the live session's snapshot", () => {
    const fv_historical = mkFrameVersion("fv-historical", 1);
    const fv_live = mkFrameVersion("fv-live", 5);
    const sv = mkSessionVersion(fv_historical);
    expect(pickFrameForSessionPreview(sv, fv_live).id).toBe("fv-historical");
  });

  it("falls back to the live session's snapshot for legacy versions with no snapshot", () => {
    const fv_live = mkFrameVersion("fv-live", 5);
    const sv = mkSessionVersion(undefined);
    expect(pickFrameForSessionPreview(sv, fv_live).id).toBe("fv-live");
  });

  it("returns the empty-version sentinel when both snapshots are missing", () => {
    const sv = mkSessionVersion(undefined);
    expect(pickFrameForSessionPreview(sv, null).id).toBe("__empty__");
  });

  it("returns the empty-version sentinel when session_version is still loading", () => {
    const fv_live = mkFrameVersion("fv-live", 5);
    expect(pickFrameForSessionPreview(null, fv_live).id).toBe("fv-live");
    expect(pickFrameForSessionPreview(null, null).id).toBe("__empty__");
  });
});
