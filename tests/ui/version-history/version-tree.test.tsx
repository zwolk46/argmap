// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { VersionTree } from "@/ui/version-history/version-tree";
import type { AnySummary } from "@/ui/version-history/version-tree-shape";

function fv(id: string, version: number, parent?: string, milestone = false): AnySummary {
  return {
    id,
    frame_id: "f1",
    version_number: version,
    parent_version_id: parent,
    created_at: new Date(Date.now() - 100).toISOString(),
    is_milestone: milestone,
  } as AnySummary;
}

describe("VersionTree", () => {
  it("renders one row per entry", () => {
    const { getAllByTestId } = render(
      <VersionTree
        entity_kind="frame"
        summaries={[fv("a", 1, undefined, true), fv("b", 2, "a")]}
        current_version_id="b"
        selected_version_id={null}
        on_select={() => {}}
        milestone_filter="all"
      />,
    );
    const rows = getAllByTestId("version-tree-row");
    expect(rows.length).toBe(2);
  });

  it("marks the current version", () => {
    const { getAllByTestId } = render(
      <VersionTree
        entity_kind="frame"
        summaries={[fv("a", 1, undefined, true), fv("b", 2, "a")]}
        current_version_id="a"
        selected_version_id={null}
        on_select={() => {}}
        milestone_filter="all"
      />,
    );
    const rows = getAllByTestId("version-tree-row");
    const current = rows.find((r) => r.getAttribute("data-version-id") === "a")!;
    expect(current.getAttribute("data-is-current")).toBe("true");
  });

  it("milestone filter drops non-milestone entries", () => {
    const { getAllByTestId } = render(
      <VersionTree
        entity_kind="frame"
        summaries={[
          fv("a", 1, undefined, true),
          fv("b", 2, "a", false),
          fv("c", 3, "b", true),
        ]}
        current_version_id="c"
        selected_version_id={null}
        on_select={() => {}}
        milestone_filter="milestones_only"
      />,
    );
    const rows = getAllByTestId("version-tree-row");
    expect(rows.map((r) => r.getAttribute("data-version-id")).sort()).toEqual(["a", "c"]);
  });

  it("renders empty-state message when filtered list is empty", () => {
    const { getByTestId } = render(
      <VersionTree
        entity_kind="frame"
        summaries={[]}
        current_version_id={null}
        selected_version_id={null}
        on_select={() => {}}
        milestone_filter="milestones_only"
      />,
    );
    expect(getByTestId("version-tree-empty").textContent).toContain("No milestones yet");
  });

  it("session variant empty-state has its own copy", () => {
    const { getByTestId } = render(
      <VersionTree
        entity_kind="session"
        summaries={[]}
        current_version_id={null}
        selected_version_id={null}
        on_select={() => {}}
        milestone_filter="all"
      />,
    );
    expect(getByTestId("version-tree-empty").textContent).toContain("session");
  });
});
