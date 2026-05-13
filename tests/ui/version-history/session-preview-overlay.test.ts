import { describe, it, expect } from "vitest";
import { buildArgumentOverlayFromSessionVersion } from "@/ui/version-history/session-preview-view";
import type { ArgumentSessionVersion } from "@/schema";

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
