import { describe, it, expect } from "vitest";
import { ALL_HOOKS } from "@/llm-hooks/hooks";
import { listHooks, HOOK_REGISTRY } from "@/llm-hooks";

describe("iteration-order: registry and ALL_HOOKS maintain sorted order", () => {
  it("ALL_HOOKS contains all 13 hooks in declaration order (G1..G13)", () => {
    const ids = ALL_HOOKS.map((h) => h.id);
    expect(ids).toHaveLength(13);
    // Declaration order: G1 first, G13 last
    expect(ids[0]).toBe("G1");
    expect(ids[ids.length - 1]).toBe("G13");
  });

  it("HOOK_REGISTRY iteration order matches sorted ids", () => {
    const regIds = [...HOOK_REGISTRY.keys()];
    expect(regIds).toEqual([...regIds].sort((a, b) => a.localeCompare(b)));
  });

  it("listHooks() returns sorted order", () => {
    const ids = listHooks().map((h) => h.id);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
  });

  it("G1 < G2 < ... < G9 < G10 < G11 < G12 < G13 in lexicographic order", () => {
    const expected = [
      "G1",
      "G10",
      "G11",
      "G12",
      "G13",
      "G2",
      "G3",
      "G4",
      "G5",
      "G6",
      "G7",
      "G8",
      "G9",
    ];
    expect(listHooks().map((h) => h.id)).toEqual(expected);
  });

  it("registry keys and ALL_HOOKS ids match", () => {
    const regIds = new Set(HOOK_REGISTRY.keys());
    for (const hook of ALL_HOOKS) {
      expect(regIds.has(hook.id)).toBe(true);
    }
    expect(regIds.size).toBe(ALL_HOOKS.length);
  });
});
