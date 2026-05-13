import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/schema";
import {
  dismissalKeyFor,
  partitionByDismissal,
} from "@/ui/frame-building/validation-drawer/dismissed-warnings";

function makeWarning(rule_id: string, node_id?: string): ValidationResult {
  return {
    rule_id,
    severity: "warning",
    message: `Warning for ${rule_id}`,
    node_id,
  };
}

function makeError(rule_id: string, node_id?: string): ValidationResult {
  return {
    rule_id,
    severity: "error",
    message: `Error for ${rule_id}`,
    node_id,
  };
}

describe("dismissalKeyFor", () => {
  it("formats key as frame_id::rule_id::node_id when all provided", () => {
    const result = makeWarning("V-FR-1", "node-42");
    expect(dismissalKeyFor(result, "frame-abc")).toBe("frame-abc::V-FR-1::node-42");
  });

  it("uses literal 'frame' as node segment when node_id is undefined", () => {
    const result = makeWarning("V-FR-3");
    expect(dismissalKeyFor(result, "f1")).toBe("f1::V-FR-3::frame");
  });
});

describe("partitionByDismissal", () => {
  // P0-20 regression: the previous test suite passed a literal `"frame"` as
  // both the partitioning default and the keys-under-test, masking a real
  // partition-vs-emit key mismatch. Tests now require a real frame_id.
  const FRAME_ID = "fr-real-abc";

  it("returns all warnings as active when dismissed_keys is empty", () => {
    const warnings: ValidationResult[] = [makeWarning("V-FR-1", "n1"), makeWarning("V-FR-2", "n2")];
    const { active, dismissed } = partitionByDismissal(warnings, new Set(), FRAME_ID);
    expect(active).toHaveLength(2);
    expect(dismissed).toHaveLength(0);
  });

  it("correctly splits into active and dismissed based on keys built with the SAME frame_id (P0-20)", () => {
    const w1 = makeWarning("V-FR-1", "n1");
    const w2 = makeWarning("V-FR-2", "n2");
    const w3 = makeWarning("V-FR-3", "n3");
    // Dismiss w2 using the same frame_id the drawer would use.
    const dismissed_keys = new Set([dismissalKeyFor(w2, FRAME_ID)]);
    const { active, dismissed } = partitionByDismissal([w1, w2, w3], dismissed_keys, FRAME_ID);
    expect(active).toHaveLength(2);
    expect(dismissed).toHaveLength(1);
    expect(active[0]).toBe(w1);
    expect(active[1]).toBe(w3);
    expect(dismissed[0]).toBe(w2);
  });

  it("does NOT match dismissed_keys built with a different frame_id — partition key must include the real frame_id (P0-20 regression)", () => {
    const w = makeWarning("V-FR-9", "n9");
    // Caller used the OLD default literal "frame" by mistake; partition uses the real id.
    const dismissed_keys_stale = new Set([dismissalKeyFor(w, "frame")]);
    const { active, dismissed } = partitionByDismissal([w], dismissed_keys_stale, FRAME_ID);
    expect(active).toHaveLength(1);
    expect(dismissed).toHaveLength(0);
  });

  it("preserves order within each partition", () => {
    const warnings: ValidationResult[] = [
      makeWarning("V-A", "n1"),
      makeWarning("V-B", "n2"),
      makeWarning("V-C", "n3"),
      makeWarning("V-D", "n4"),
    ];
    const dismissed_keys = new Set([
      dismissalKeyFor(warnings[1], FRAME_ID),
      dismissalKeyFor(warnings[3], FRAME_ID),
    ]);
    const { active, dismissed } = partitionByDismissal(warnings, dismissed_keys, FRAME_ID);
    expect(active.map((w) => w.rule_id)).toEqual(["V-A", "V-C"]);
    expect(dismissed.map((w) => w.rule_id)).toEqual(["V-B", "V-D"]);
  });

  it("works with a mix of errors and warnings (partitions by key regardless of severity)", () => {
    const w = makeWarning("V-FR-1", "n1");
    const e = makeError("V-FR-E", "n2");
    const dismissed_keys = new Set([dismissalKeyFor(e, FRAME_ID)]);
    const { active, dismissed } = partitionByDismissal([w, e], dismissed_keys, FRAME_ID);
    expect(active).toHaveLength(1);
    expect(active[0].rule_id).toBe("V-FR-1");
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].rule_id).toBe("V-FR-E");
  });
});
