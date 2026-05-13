// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CompareEntryList } from "@/ui/version-history/compare-entry-list";

describe("CompareEntryList", () => {
  it("empty entries renders null", () => {
    const { container } = render(
      <CompareEntryList
        title="Nodes added"
        kind="added"
        entries={[]}
        on_navigate_to_entity={() => {}}
      />,
    );
    expect(container.querySelector("[data-testid='compare-entry-list']")).toBeNull();
  });

  it("non-empty: header includes count '(N)' and entries render in order", () => {
    const { getByTestId, getAllByTestId } = render(
      <CompareEntryList
        title="Nodes added"
        kind="added"
        entries={[
          {
            kind: "node_added",
            node_id: "x",
            node_type: "SubQuestion",
            statement_preview: "First",
          },
          {
            kind: "node_added",
            node_id: "y",
            node_type: "SubQuestion",
            statement_preview: "Second",
          },
        ]}
        on_navigate_to_entity={() => {}}
      />,
    );
    expect(getByTestId("compare-entry-list-title").textContent).toBe("Nodes added (2)");
    const rows = getAllByTestId("compare-entry-row");
    expect(rows[0].textContent).toContain("First");
    expect(rows[1].textContent).toContain("Second");
  });

  it("layout_only kind renders an expand affordance", () => {
    const { getByTestId } = render(
      <CompareEntryList
        title="Layout-only changes"
        kind="layout_only"
        entries={[{ kind: "layout_only_summary", node_count: 7 }]}
        on_navigate_to_entity={() => {}}
      />,
    );
    expect(getByTestId("compare-entry-list-expand")).toBeTruthy();
  });
});
