import { describe, it, expect } from "vitest";
import { previewProse } from "@/ui/session-settings";

describe("previewProse", () => {
  it("returns empty string for undefined", () => {
    expect(previewProse(undefined)).toBe("");
  });

  it("returns input unchanged when shorter than max_len", () => {
    expect(previewProse("hello", 100)).toBe("hello");
  });

  it("truncates with ellipsis when longer than max_len", () => {
    const out = previewProse("a".repeat(200), 50);
    expect(out.length).toBe(51);
    expect(out.endsWith("…")).toBe(true);
  });

  it("default max_len is 120", () => {
    const out = previewProse("a".repeat(200));
    expect(out.length).toBe(121);
  });
});
