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

  it("defaults frame_id to 'frame' when not supplied", () => {
    const result = makeWarning("V-FR-2", "node-7");
    expect(dismissalKeyFor(result)).toBe("frame::V-FR-2::node-7");
  });

  it("uses literal 'frame' as node segment when node_id is undefined", () => {
    const result = makeWarning("V-FR-3");
    expect(dismissalKeyFor(result, "f1")).toBe("f1::V-FR-3::frame");
  });

  it("uses 'frame' for both defaults when called with only the result", () => {
    const result = makeWarning("V-FR-4");
    expect(dismissalKeyFor(result)).toBe("frame::V-FR-4::frame");
  });
});

describe("partitionByDismissal", () => {
  it("returns all warnings as active when dismissed_keys is empty", () => {
    const warnings: ValidationResult[] = [makeWarning("V-FR-1", "n1"), makeWarning("V-FR-2", "n2")];
    const { active, dismissed } = partitionByDismissal(warnings, new Set());
    expect(active).toHaveLength(2);
    expect(dismissed).toHaveLength(0);
  });

  it("correctly splits into active and dismissed based on keys", () => {
    const w1 = makeWarning("V-FR-1", "n1");
    const w2 = makeWarning("V-FR-2", "n2");
    const w3 = makeWarning("V-FR-3", "n3");
    const dismissed_keys = new Set([dismissalKeyFor(w2)]);
    const { active, dismissed } = partitionByDismissal([w1, w2, w3], dismissed_keys);
    expect(active).toHaveLength(2);
    expect(dismissed).toHaveLength(1);
    expect(active[0]).toBe(w1);
    expect(active[1]).toBe(w3);
    expect(dismissed[0]).toBe(w2);
  });

  it("preserves order within each partition", () => {
    const warnings: ValidationResult[] = [
      makeWarning("V-A", "n1"),
      makeWarning("V-B", "n2"),
      makeWarning("V-C", "n3"),
      makeWarning("V-D", "n4"),
    ];
    // dismiss B and D
    const dismissed_keys = new Set([dismissalKeyFor(warnings[1]), dismissalKeyFor(warnings[3])]);
    const { active, dismissed } = partitionByDismissal(warnings, dismissed_keys);
    expect(active.map((w) => w.rule_id)).toEqual(["V-A", "V-C"]);
    expect(dismissed.map((w) => w.rule_id)).toEqual(["V-B", "V-D"]);
  });

  it("works with a mix of errors and warnings (partitions by key regardless of severity)", () => {
    const w = makeWarning("V-FR-1", "n1");
    const e = makeError("V-FR-E", "n2");
    // errors can also be dismissed if caller provides the key
    const dismissed_keys = new Set([dismissalKeyFor(e)]);
    const { active, dismissed } = partitionByDismissal([w, e], dismissed_keys);
    expect(active).toHaveLength(1);
    expect(active[0].rule_id).toBe("V-FR-1");
    expect(dismissed).toHaveLength(1);
    expect(dismissed[0].rule_id).toBe("V-FR-E");
  });
});
