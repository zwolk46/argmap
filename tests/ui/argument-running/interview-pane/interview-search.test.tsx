// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { searchMatches } from "@/ui/argument-running/interview-pane/interview-search";

describe("searchMatches", () => {
  it("returns true for empty query", () => {
    expect(searchMatches("anything goes", "")).toBe(true);
  });
  it("matches case-insensitive substring", () => {
    expect(searchMatches("Duty of Care", "duty")).toBe(true);
    expect(searchMatches("Duty of Care", "of care")).toBe(true);
  });
  it("does not match unrelated", () => {
    expect(searchMatches("Duty", "negligence")).toBe(false);
  });
});
