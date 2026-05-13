// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  DecisionTreeTab,
  layoutDecisionTreeBranches,
} from "@/ui/argument-running/output-viewer/decision-tree-tab";
import type { ConditionalBranch } from "@/schema";
import type { OutputViewPayload } from "@/state";

function branch(id: string, label: string, gate: string): ConditionalBranch {
  return {
    id,
    conditions: [{ gate_node_id: gate, required_value: "true", required_value_label: label }],
    resulting_conclusion: "concl",
    intermediate_path: [],
    prose: "",
  };
}

describe("layoutDecisionTreeBranches", () => {
  it("returns one box per branch, sorted by id", () => {
    const branches = [branch("b", "B", "g2"), branch("a", "A", "g1")];
    const boxes = layoutDecisionTreeBranches(branches);
    expect(boxes.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("is deterministic byte-by-byte for identical inputs", () => {
    const branches = [branch("a", "A", "g1"), branch("b", "B", "g2")];
    expect(JSON.stringify(layoutDecisionTreeBranches(branches))).toEqual(
      JSON.stringify(layoutDecisionTreeBranches(branches)),
    );
  });

  it("vertical layout: y increases per row", () => {
    const branches = [branch("a", "A", "g1"), branch("b", "B", "g2")];
    const boxes = layoutDecisionTreeBranches(branches);
    expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
  });
});

describe("DecisionTreeTab", () => {
  it("renders an empty state when payload is null", () => {
    const { getByTestId } = render(
      <DecisionTreeTab payload={null} root_node_id_hint={null} on_branch_clicked={vi.fn()} />,
    );
    expect(getByTestId("decision-tree-empty")).toBeTruthy();
  });

  it("renders one g per branch", () => {
    const payload: OutputViewPayload = {
      shape: "conditional",
      decision_tree: { branches: [branch("a", "A", "g1"), branch("b", "B", "g2")] },
    };
    const { getByTestId } = render(
      <DecisionTreeTab payload={payload} root_node_id_hint={null} on_branch_clicked={vi.fn()} />,
    );
    expect(getByTestId("decision-tree-branch-a")).toBeTruthy();
    expect(getByTestId("decision-tree-branch-b")).toBeTruthy();
  });

  it("fires on_branch_clicked with the gate node id on click", () => {
    const cb = vi.fn();
    const payload: OutputViewPayload = {
      shape: "conditional",
      decision_tree: { branches: [branch("a", "A", "gate-x")] },
    };
    const { getByTestId } = render(
      <DecisionTreeTab payload={payload} root_node_id_hint={null} on_branch_clicked={cb} />,
    );
    (
      getByTestId("decision-tree-branch-a") as unknown as {
        dispatchEvent: typeof Element.prototype.dispatchEvent;
      }
    ).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(cb).toHaveBeenCalledWith("gate-x");
  });
});
