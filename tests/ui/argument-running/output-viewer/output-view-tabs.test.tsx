// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  OutputViewTabs,
  OUTPUT_VIEW_TAB_ORDER,
} from "@/ui/argument-running/output-viewer/output-view-tabs";

describe("OUTPUT_VIEW_TAB_ORDER", () => {
  it("is path_overlay, decision_tree, prose", () => {
    expect(OUTPUT_VIEW_TAB_ORDER).toEqual(["path_overlay", "decision_tree", "prose"]);
  });
});

describe("OutputViewTabs", () => {
  it("renders three tabs and marks the active one", () => {
    const on_change = vi.fn();
    const { getByTestId } = render(
      <OutputViewTabs current="decision_tree" on_change={on_change} />,
    );
    expect(getByTestId("output-view-tab-path_overlay").getAttribute("data-active")).toBe("false");
    expect(getByTestId("output-view-tab-decision_tree").getAttribute("data-active")).toBe("true");
    expect(getByTestId("output-view-tab-prose").getAttribute("data-active")).toBe("false");
  });

  it("disables all tabs and shows Computing… when computing=true", () => {
    const { getAllByRole } = render(
      <OutputViewTabs current="prose" on_change={vi.fn()} computing={true} />,
    );
    const tabs = getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    tabs.forEach((t) => expect(t.getAttribute("disabled")).not.toBeNull());
    expect(tabs[0]?.textContent).toContain("Computing");
  });

  it("calls on_change with the tab clicked", () => {
    const on_change = vi.fn();
    const { getByTestId } = render(<OutputViewTabs current="prose" on_change={on_change} />);
    getByTestId("output-view-tab-decision_tree").click();
    expect(on_change).toHaveBeenCalledWith("decision_tree");
  });
});
