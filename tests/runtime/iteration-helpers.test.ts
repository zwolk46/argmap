import { describe, it, expect } from "vitest";
import { sortedKeys, sortedEntries, sortedIter } from "@/runtime/iteration-helpers";

describe("runtime/iteration-helpers", () => {
  it("sortedKeys returns keys in lexicographic order", () => {
    const obj = { c: 1, a: 2, b: 3 };
    expect(sortedKeys(obj)).toEqual(["a", "b", "c"]);
  });

  it("sortedEntries returns entries in lexicographic key order", () => {
    const obj = { c: 1, a: 2, b: 3 };
    expect(sortedEntries(obj)).toEqual([
      ["a", 2],
      ["b", 3],
      ["c", 1],
    ]);
  });

  it("sortedIter over a Set returns elements in JSON-lexicographic order", () => {
    const s = new Set(["c", "a", "b"]);
    expect(sortedIter(s)).toEqual(["a", "b", "c"]);
  });

  it("sortedIter over a Map returns values keyed by JSON-lexicographic key order", () => {
    const m = new Map<string, number>();
    m.set("z", 1);
    m.set("a", 2);
    m.set("m", 3);
    expect(sortedIter(m)).toEqual([2, 3, 1]);
  });

  it("frozen clock applies in this test file", () => {
    expect(new Date().toISOString()).toBe("2026-05-10T00:00:00.000Z");
  });
});
