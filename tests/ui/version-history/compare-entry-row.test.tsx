// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { CompareEntryRow } from "@/ui/version-history/compare-entry-row";

describe("CompareEntryRow", () => {
  it("node_added: renders statement_preview and is clickable", () => {
    const on_navigate = vi.fn();
    const { getByText, getByTestId } = render(
      <CompareEntryRow
        descriptor={{
          kind: "node_added",
          node_id: "n1",
          node_type: "SubQuestion",
          statement_preview: "Was the contract breached?",
        }}
        on_navigate_to_entity={on_navigate}
      />,
    );
    expect(getByText("Was the contract breached?")).toBeTruthy();
    fireEvent.click(getByTestId("compare-entry-row"));
    expect(on_navigate).toHaveBeenCalledWith("n1");
  });

  it("node_edited: renders fields_changed list verbatim", () => {
    const { getByText } = render(
      <CompareEntryRow
        descriptor={{
          kind: "node_edited",
          node_id: "n2",
          node_type: "Term",
          statement_preview: "merchant",
          fields_changed: ["statement", "notes"],
        }}
        on_navigate_to_entity={() => {}}
      />,
    );
    expect(getByText("(fields: statement, notes)")).toBeTruthy();
  });

  it("metadata_changed: non-clickable, no navigate call", () => {
    const on_navigate = vi.fn();
    const { getByTestId } = render(
      <CompareEntryRow
        descriptor={{ kind: "metadata_changed", field: "title" }}
        on_navigate_to_entity={on_navigate}
      />,
    );
    fireEvent.click(getByTestId("compare-entry-row"));
    expect(on_navigate).not.toHaveBeenCalled();
  });

  it("layout_only_summary: renders 'Layout updated for N nodes'", () => {
    const { getByText } = render(
      <CompareEntryRow
        descriptor={{ kind: "layout_only_summary", node_count: 4 }}
        on_navigate_to_entity={() => {}}
      />,
    );
    expect(getByText("Layout updated for 4 nodes")).toBeTruthy();
  });
});
