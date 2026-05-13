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
});
