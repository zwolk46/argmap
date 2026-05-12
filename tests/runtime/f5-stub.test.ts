import { describe, it, expect } from "vitest";
import { F5_AVAILABLE, queryF5Binding } from "@/runtime/f5";

describe("F5 stub (v1)", () => {
  it("F5_AVAILABLE is false", () => {
    expect(F5_AVAILABLE).toBe(false);
  });
  it("queryF5Binding returns undefined for any input", () => {
    expect(queryF5Binding("court-a", "court-b")).toBeUndefined();
    expect(queryF5Binding("", "")).toBeUndefined();
  });
});
