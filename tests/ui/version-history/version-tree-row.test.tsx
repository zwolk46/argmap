// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { VersionTreeRow } from "@/ui/version-history/version-tree-row";
import type { AnySummary } from "@/ui/version-history/version-tree-shape";

function fv(id: string, version: number, milestone: boolean, change_summary?: string): AnySummary {
  return {
    id,
    frame_id: "f1",
    version_number: version,
    created_at: new Date(Date.now() - 1000).toISOString(),
    is_milestone: milestone,
    change_summary,
  } as AnySummary;
}

describe("VersionTreeRow", () => {
  it("renders version number", () => {
    const { getByText } = render(
      <VersionTreeRow
        summary={fv("a", 3, false)}
        depth={0}
        is_current={false}
        is_milestone={false}
        is_authored_against={false}
        is_selected={false}
        on_select={() => {}}
      />,
    );
    expect(getByText("v3")).toBeTruthy();
  });

  it("falls back to italic 'auto-save' label when change_summary is empty", () => {
    const { getByText } = render(
      <VersionTreeRow
        summary={fv("a", 2, false)}
        depth={0}
        is_current={false}
        is_milestone={false}
        is_authored_against={false}
        is_selected={false}
        on_select={() => {}}
      />,
    );
    expect(getByText("auto-save")).toBeTruthy();
  });

  it("renders the change_summary verbatim when provided", () => {
    const { getByText } = render(
      <VersionTreeRow
        summary={fv("a", 2, true, "Important checkpoint")}
        depth={0}
        is_current={false}
        is_milestone={true}
        is_authored_against={false}
        is_selected={false}
        on_select={() => {}}
      />,
    );
    expect(getByText("Important checkpoint")).toBeTruthy();
  });

  it("renders the authored-against pill when is_authored_against", () => {
    const { getByTestId } = render(
      <VersionTreeRow
        summary={fv("a", 1, true)}
        depth={0}
        is_current={false}
        is_milestone={true}
        is_authored_against={true}
        is_selected={false}
        on_select={() => {}}
      />,
    );
    expect(getByTestId("authored-against-pill")).toBeTruthy();
  });

  it("aria-pressed reflects selection state", () => {
    const { getByTestId } = render(
      <VersionTreeRow
        summary={fv("a", 1, false)}
        depth={0}
        is_current={false}
        is_milestone={false}
        is_authored_against={false}
        is_selected={true}
        on_select={() => {}}
      />,
    );
    expect(getByTestId("version-tree-row").getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking the row dispatches on_select with the version id", () => {
    const on_select = vi.fn();
    const { getByTestId } = render(
      <VersionTreeRow
        summary={fv("xyz", 1, false)}
        depth={0}
        is_current={false}
        is_milestone={false}
        is_authored_against={false}
        is_selected={false}
        on_select={on_select}
      />,
    );
    fireEvent.click(getByTestId("version-tree-row"));
    expect(on_select).toHaveBeenCalledWith("xyz");
  });
});
