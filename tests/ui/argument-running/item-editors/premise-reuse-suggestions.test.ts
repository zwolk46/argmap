import { describe, it, expect } from "vitest";
import {
  rankPremiseReuse,
  REUSE_SIMILARITY_THRESHOLD,
  REUSE_TOP_N,
} from "@/ui/argument-running/item-editors/premise-reuse-suggestions";
import type { Premise } from "@/schema";

const ts = "2026-05-12T00:00:00.000Z";

function p(id: string, statement: string, kind: Premise["kind"] = "found"): Premise {
  return {
    id,
    type: "Premise",
    layer: "argument",
    statement,
    kind,
    created_at: ts,
    updated_at: ts,
  };
}

describe("rankPremiseReuse", () => {
  it("returns empty list for empty draft", () => {
    const r = rankPremiseReuse("", [p("p1", "duty of care")]);
    expect(r).toEqual([]);
  });

  it("filters out premises below similarity threshold", () => {
    const r = rankPremiseReuse("duty of care", [p("p1", "moonlight serenade waltz")]);
    expect(r).toHaveLength(0);
  });

  it("keeps premises above threshold and sorts by score desc, id asc", () => {
    const r = rankPremiseReuse("duty care of reasonable", [
      p("z", "duty of care"),
      p("a", "duty of care"),
      p("c", "negligent driving"),
    ]);
    const ids = r.map((x) => x.premise.id);
    expect(ids[0]).toBe("a"); // tiebreaker: lex id
  });

  it("is deterministic — same inputs yield identical order", () => {
    const inputs: Premise[] = [
      p("p1", "the duty of care was breached"),
      p("p2", "duty of reasonable care was breached"),
    ];
    const r1 = rankPremiseReuse("duty care breached", inputs);
    const r2 = rankPremiseReuse("duty care breached", inputs);
    expect(r1.map((x) => x.premise.id)).toEqual(r2.map((x) => x.premise.id));
  });

  it("caps output at REUSE_TOP_N", () => {
    const inputs = Array.from({ length: 10 }, (_, i) => p(`p${i}`, "duty of care alleged"));
    const r = rankPremiseReuse("duty of care alleged", inputs);
    expect(r.length).toBeLessThanOrEqual(REUSE_TOP_N);
  });

  it("constants are sensible defaults", () => {
    expect(REUSE_SIMILARITY_THRESHOLD).toBeGreaterThan(0);
    expect(REUSE_SIMILARITY_THRESHOLD).toBeLessThan(1);
    expect(REUSE_TOP_N).toBeGreaterThan(0);
  });
});
