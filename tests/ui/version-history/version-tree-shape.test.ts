import { describe, it, expect } from "vitest";
import {
  buildVersionTreeShape,
  filterByMilestone,
  type AnySummary,
} from "@/ui/version-history/version-tree-shape";

function fv(
  id: string,
  version_number: number,
  parent: string | undefined,
  milestone = false,
): AnySummary {
  return {
    id,
    frame_id: "f1",
    version_number,
    parent_version_id: parent,
    created_at: "",
    is_milestone: milestone,
  } as AnySummary;
}

describe("buildVersionTreeShape", () => {
  it("linear history produces flat output at depth 0", () => {
    const summaries = [fv("a", 1, undefined, true), fv("b", 2, "a"), fv("c", 3, "b", true)];
    const out = buildVersionTreeShape(summaries);
    expect(out.map((e) => [e.summary.id, e.depth])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("single branch off a milestone yields depth-1 child", () => {
    const summaries = [fv("a", 1, undefined, true), fv("b", 2, "a"), fv("c", 3, "a")];
    const out = buildVersionTreeShape(summaries);
    // a is root; b and c are both children of a.
    expect(out[0].summary.id).toBe("a");
    expect(out[0].depth).toBe(0);
    expect(out[0].has_branch_children).toBe(true);
    expect(
      out
        .filter((e) => e.depth === 1)
        .map((e) => e.summary.id)
        .sort(),
    ).toEqual(["b", "c"]);
  });

  it("DFS orders children by version_number ascending", () => {
    const summaries = [fv("root", 1, undefined), fv("c2", 3, "root"), fv("c1", 2, "root")];
    const out = buildVersionTreeShape(summaries);
    expect(out.map((e) => e.summary.id)).toEqual(["root", "c1", "c2"]);
  });

  it("deterministic: identical input twice yields byte-identical output", () => {
    const summaries = [
      fv("root", 1, undefined),
      fv("c2", 3, "root"),
      fv("c1", 2, "root"),
      fv("gc", 4, "c1"),
    ];
    const a = buildVersionTreeShape(summaries);
    const b = buildVersionTreeShape(summaries);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("is_last_child_of_parent flag is true only for terminal siblings", () => {
    const summaries = [fv("root", 1, undefined), fv("a", 2, "root"), fv("b", 3, "root")];
    const out = buildVersionTreeShape(summaries);
    const a = out.find((e) => e.summary.id === "a")!;
    const b = out.find((e) => e.summary.id === "b")!;
    expect(a.is_last_child_of_parent).toBe(false);
    expect(b.is_last_child_of_parent).toBe(true);
  });

  it("handles roots with missing parent_version_id", () => {
    const summaries = [fv("orphan-child", 5, "missing"), fv("root", 1, undefined, true)];
    const out = buildVersionTreeShape(summaries);
    // Both treated as roots since their parents are not in the summary list.
    expect(out.map((e) => e.summary.id).sort()).toEqual(["orphan-child", "root"]);
    expect(out.every((e) => e.depth === 0)).toBe(true);
  });
});

describe("filterByMilestone", () => {
  it("retains only milestones", () => {
    const summaries = [fv("a", 1, undefined, true), fv("b", 2, "a", false), fv("c", 3, "b", true)];
    const out = filterByMilestone(summaries);
    expect(out.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("re-parents children of dropped non-milestone ancestors to nearest milestone", () => {
    const summaries = [
      fv("a", 1, undefined, true),
      fv("b", 2, "a", false), // dropped
      fv("c", 3, "b", true), // becomes child of "a"
    ];
    const out = filterByMilestone(summaries);
    const c = out.find((s) => s.id === "c")!;
    expect(c.parent_version_id).toBe("a");
  });

  it("re-parents to undefined when no milestone ancestor remains", () => {
    const summaries = [
      fv("a", 1, undefined, false),
      fv("b", 2, "a", true), // root milestone after filter
    ];
    const out = filterByMilestone(summaries);
    const b = out.find((s) => s.id === "b")!;
    expect(b.parent_version_id).toBeUndefined();
  });

  it("preserves tree shape after re-parenting", () => {
    const summaries = [
      fv("a", 1, undefined, true),
      fv("b", 2, "a", false),
      fv("c", 3, "b", true),
      fv("d", 4, "c", true),
    ];
    const filtered = filterByMilestone(summaries);
    const tree = buildVersionTreeShape(filtered);
    expect(tree.map((e) => [e.summary.id, e.depth])).toEqual([
      ["a", 0],
      ["c", 1],
      ["d", 2],
    ]);
  });
});
