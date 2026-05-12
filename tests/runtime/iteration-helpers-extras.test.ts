import { describe, it, expect } from "vitest";
import { sortedBy, sortedIter } from "@/runtime/iteration-helpers";

describe("runtime/iteration-helpers — sortedBy", () => {
  it("stable sort by string key", () => {
    const xs = [
      { id: "c", v: 1 },
      { id: "a", v: 2 },
      { id: "b", v: 3 },
    ];
    expect(sortedBy(xs, (x) => x.id).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("returns a fresh array (does not mutate input)", () => {
    const xs = [{ id: "c" }, { id: "a" }, { id: "b" }];
    const sorted = sortedBy(xs, (x) => x.id);
    expect(xs.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("runtime/iteration-helpers — sortedIter with keyFn", () => {
  it("respects custom key extractor on a Set of objects", () => {
    const s = new Set([{ id: "c" }, { id: "a" }, { id: "b" }]);
    const sorted = sortedIter(s, (x) => x.id);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});
