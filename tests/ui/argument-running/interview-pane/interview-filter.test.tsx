// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import {
  DEFAULT_INTERVIEW_FILTER,
  INTERVIEW_FILTER_NODE_TYPES,
  INTERVIEW_FILTER_REASONS,
  passesFilter,
  type InterviewFilterState,
} from "@/ui/argument-running/interview-pane/interview-filter";
import type { InterviewItem } from "@/state";

function makeItem(overrides: Partial<InterviewItem> = {}): InterviewItem {
  return {
    node_id: "n-1",
    is_jurisdictional: false,
    reason: "open",
    recommended_next: false,
    dfs_order: 0,
    term_order: 0,
    ...overrides,
  };
}

describe("DEFAULT_INTERVIEW_FILTER", () => {
  it("starts with all types/reasons and 'all' scope", () => {
    expect(DEFAULT_INTERVIEW_FILTER.node_types).toEqual([]);
    expect(DEFAULT_INTERVIEW_FILTER.jurisdictional_scope).toBe("all");
    expect(DEFAULT_INTERVIEW_FILTER.reasons).toEqual([]);
  });
});

describe("INTERVIEW_FILTER_NODE_TYPES", () => {
  it("lists Checkpoint, Term, Interpretation", () => {
    expect(INTERVIEW_FILTER_NODE_TYPES).toEqual(["Checkpoint", "Term", "Interpretation"]);
  });
});

describe("INTERVIEW_FILTER_REASONS", () => {
  it("lists the four canonical reasons", () => {
    expect(INTERVIEW_FILTER_REASONS).toEqual([
      "open",
      "indeterminate",
      "contested",
      "best_inference_pending",
    ]);
  });
});

describe("passesFilter", () => {
  it("passes everything when filter is default", () => {
    const item = makeItem();
    expect(passesFilter(item, DEFAULT_INTERVIEW_FILTER)).toBe(true);
  });

  it("filters out non-jurisdictional when scope is jurisdictional_only", () => {
    const state: InterviewFilterState = {
      ...DEFAULT_INTERVIEW_FILTER,
      jurisdictional_scope: "jurisdictional_only",
    };
    expect(passesFilter(makeItem({ is_jurisdictional: false }), state)).toBe(false);
    expect(passesFilter(makeItem({ is_jurisdictional: true }), state)).toBe(true);
  });

  it("filters out reasons not in the included list", () => {
    const state: InterviewFilterState = { ...DEFAULT_INTERVIEW_FILTER, reasons: ["open"] };
    expect(passesFilter(makeItem({ reason: "open" }), state)).toBe(true);
    expect(passesFilter(makeItem({ reason: "contested" }), state)).toBe(false);
  });

  it("treats an empty reasons array as 'allow all reasons'", () => {
    const state: InterviewFilterState = { ...DEFAULT_INTERVIEW_FILTER, reasons: [] };
    expect(passesFilter(makeItem({ reason: "contested" }), state)).toBe(true);
  });

  // P0-19 regression: chips visibly toggled but the list never changed
  // because passesFilter never honored state.node_types.
  it("filters by node_types when chips are active (P0-19)", () => {
    const state: InterviewFilterState = {
      ...DEFAULT_INTERVIEW_FILTER,
      node_types: ["Checkpoint"],
    };
    const item = makeItem();
    expect(passesFilter(item, state, "Checkpoint")).toBe(true);
    expect(passesFilter(item, state, "Term")).toBe(false);
    expect(passesFilter(item, state, "Interpretation")).toBe(false);
  });

  it("treats an empty node_types array as 'allow all node types'", () => {
    const state: InterviewFilterState = { ...DEFAULT_INTERVIEW_FILTER, node_types: [] };
    expect(passesFilter(makeItem(), state, "Term")).toBe(true);
    expect(passesFilter(makeItem(), state, "Checkpoint")).toBe(true);
  });

  it("with multiple chips active, passes any item whose type is in the set", () => {
    const state: InterviewFilterState = {
      ...DEFAULT_INTERVIEW_FILTER,
      node_types: ["Checkpoint", "Interpretation"],
    };
    expect(passesFilter(makeItem(), state, "Checkpoint")).toBe(true);
    expect(passesFilter(makeItem(), state, "Interpretation")).toBe(true);
    expect(passesFilter(makeItem(), state, "Term")).toBe(false);
  });

  it("when node_type is undefined (legacy caller), skips node-type filtering — preserves backward compatibility", () => {
    const state: InterviewFilterState = {
      ...DEFAULT_INTERVIEW_FILTER,
      node_types: ["Checkpoint"],
    };
    // Without a resolved node_type, the chip filter is a no-op (item passes
    // unless something else excludes it).
    expect(passesFilter(makeItem(), state)).toBe(true);
  });
});
