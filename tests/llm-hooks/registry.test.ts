import { describe, it, expect } from "vitest";
import { getHook, listHooks, listHooksForMode, HOOK_REGISTRY } from "@/llm-hooks";

describe("HOOK_REGISTRY", () => {
  it("getHook returns the hook for a known id", () => {
    expect(getHook("G1").id).toBe("G1");
  });

  it("getHook throws for an unknown id", () => {
    expect(() => getHook("GZ" as never)).toThrow(/Unknown hook id/);
  });

  it("listHooks iteration order is alphabetic by id (deterministic)", () => {
    const ids = listHooks().map((h) => h.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("listHooksForMode('legal') excludes G9 (general only)", () => {
    const ids = listHooksForMode("legal").map((h) => h.id);
    expect(ids).not.toContain("G9");
  });

  it("listHooksForMode('general', 'personal') excludes G5 (legal only)", () => {
    const ids = listHooksForMode("general", "personal").map((h) => h.id);
    expect(ids).not.toContain("G5");
  });

  it("HOOK_REGISTRY has 13 entries", () => {
    expect(HOOK_REGISTRY.size).toBe(13);
  });

  it("getHook('G5') returns G5 (legal only)", () => {
    const h = getHook("G5");
    expect(h.mode_visibility.legal).toBe(true);
    expect(h.mode_visibility.general.personal).toBe(false);
  });
});
