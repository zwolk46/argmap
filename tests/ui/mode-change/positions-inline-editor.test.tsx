// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PositionsInlineEditor } from "@/ui/mode-change/positions-inline-editor";

describe("PositionsInlineEditor", () => {
  it("renders staged positions in insertion order", () => {
    const { getAllByTestId } = render(
      <PositionsInlineEditor
        staged_positions={[
          { id: "p1", label: "First" },
          { id: "p2", label: "Second" },
        ]}
        onPositionStaged={() => {}}
        onPositionRemoved={() => {}}
        generateId={() => "x"}
      />,
    );
    const rows = getAllByTestId("staged-position-row");
    // The × glyph migrated to a Phosphor X SVG (no textContent). Assert on
    // the label text instead.
    expect(rows.map((r) => r.textContent?.trim())).toEqual(["First", "Second"]);
  });

  it("disables Add when draft is empty/whitespace", () => {
    const { getByTestId } = render(
      <PositionsInlineEditor
        staged_positions={[]}
        onPositionStaged={() => {}}
        onPositionRemoved={() => {}}
        generateId={() => "x"}
      />,
    );
    expect((getByTestId("position-add-button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("adds a staged position via input + button", () => {
    const onStage = vi.fn();
    let idx = 0;
    const { getByTestId } = render(
      <PositionsInlineEditor
        staged_positions={[]}
        onPositionStaged={onStage}
        onPositionRemoved={() => {}}
        generateId={() => `gen-${++idx}`}
      />,
    );
    const input = getByTestId("position-draft-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Plaintiff wins" } });
    fireEvent.click(getByTestId("position-add-button"));
    expect(onStage).toHaveBeenCalledWith({ id: "gen-1", label: "Plaintiff wins" });
    expect(input.value).toBe("");
  });

  it("calls onPositionRemoved with id when remove icon clicked", () => {
    const onRemove = vi.fn();
    const { getByTestId } = render(
      <PositionsInlineEditor
        staged_positions={[{ id: "p1", label: "First" }]}
        onPositionStaged={() => {}}
        onPositionRemoved={onRemove}
        generateId={() => "x"}
      />,
    );
    fireEvent.click(getByTestId("remove-staged-position"));
    expect(onRemove).toHaveBeenCalledWith("p1");
  });
});
