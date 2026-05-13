// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AdvisoryList } from "@/ui/mode-change/advisory-list";

describe("AdvisoryList", () => {
  it("groups advisory entries by rule_id preserving first-occurrence order", () => {
    const { getAllByTestId } = render(
      <AdvisoryList
        advisory={[
          { rule_id: "B", severity: "warning", message: "b1" },
          { rule_id: "A", severity: "warning", message: "a1" },
          { rule_id: "B", severity: "warning", message: "b2" },
          { rule_id: "A", severity: "warning", message: "a2" },
        ]}
      />,
    );
    const groups = getAllByTestId("advisory-group");
    expect(groups.map((g) => g.getAttribute("data-rule-id"))).toEqual(["B", "A"]);
  });

  it("renders pills as non-interactive when onNodeFocusRequested is undefined", () => {
    const { getByTestId } = render(
      <AdvisoryList
        advisory={[{ rule_id: "X", severity: "warning", node_id: "n1", message: "msg" }]}
      />,
    );
    const pill = getByTestId("advisory-node-pill") as HTMLButtonElement;
    expect(pill.disabled).toBe(true);
  });

  it("calls onNodeFocusRequested when pill clicked", () => {
    const cb = vi.fn();
    const { getByTestId } = render(
      <AdvisoryList
        advisory={[{ rule_id: "X", severity: "warning", node_id: "n1", message: "msg" }]}
        onNodeFocusRequested={cb}
      />,
    );
    fireEvent.click(getByTestId("advisory-node-pill"));
    expect(cb).toHaveBeenCalledWith("n1");
  });
});
