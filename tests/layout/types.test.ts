import { describe, it, expect } from "vitest";
import { DEFAULT_LAYOUT_OPTIONS, resolveLayoutOptions, resolveLayoutDeps } from "@/layout/types";

describe("layout/types", () => {
  it("DEFAULT_LAYOUT_OPTIONS is DOWN / honor / collapse", () => {
    expect(DEFAULT_LAYOUT_OPTIONS).toEqual({
      direction: "DOWN",
      honor_user_anchors: true,
      collapse_subquestions: true,
    });
  });

  it("resolveLayoutOptions(undefined) equals DEFAULT_LAYOUT_OPTIONS", () => {
    expect(resolveLayoutOptions(undefined)).toEqual(DEFAULT_LAYOUT_OPTIONS);
  });

  it("resolveLayoutOptions overrides only the named fields", () => {
    expect(resolveLayoutOptions({ direction: "RIGHT" })).toEqual({
      ...DEFAULT_LAYOUT_OPTIONS,
      direction: "RIGHT",
    });
  });

  it("resolveLayoutDeps(undefined).now returns an ISO-8601-shaped string", () => {
    const out = resolveLayoutDeps(undefined).now();
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });

  it("resolveLayoutDeps respects an injected now()", () => {
    const out = resolveLayoutDeps({ now: () => "frozen" }).now();
    expect(out).toBe("frozen");
  });
});
