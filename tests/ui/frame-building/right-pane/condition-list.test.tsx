// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ConditionList } from "@/ui/frame-building/right-pane/condition-list";
import type { SatisfactionPolicy, Condition } from "@/schema";

describe("ConditionList", () => {
  it("renders conditions in CONDITION_KIND_PRIORITY order regardless of insertion order", () => {
    // Insert conditions in reverse priority order (not_foreclosed=11, standard_of_review=10, premise_attached=0)
    const all_of: Condition[] = [
      { kind: "not_foreclosed" } as Condition,
      { kind: "standard_of_review_applied" } as Condition,
      { kind: "premise_attached" } as Condition,
    ];
    const policy: SatisfactionPolicy = { all_of };

    const { getAllByText } = render(
      <ConditionList policy={policy} on_change={() => {}} mode_flavor="legal" />,
    );

    // Find all condition kind pills rendered in the component
    // ConditionRow renders the kind as a span pill text
    const premise_attached = getAllByText("Premise attached");
    const not_foreclosed = getAllByText("Not foreclosed");
    const standard_of_review = getAllByText("Standard of review applied");

    expect(premise_attached.length).toBeGreaterThan(0);
    expect(not_foreclosed.length).toBeGreaterThan(0);
    expect(standard_of_review.length).toBeGreaterThan(0);

    // Check DOM order — premise_attached priority is 0, standard_of_review is 10, not_foreclosed is 11
    const premise_el = premise_attached[0];
    const standard_el = standard_of_review[0];
    const foreclosed_el = not_foreclosed[0];

    // compareDocumentPosition: if node A comes before B, A.compareDocumentPosition(B) has bit 4 set
    expect(
      premise_el.compareDocumentPosition(standard_el) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      standard_el.compareDocumentPosition(foreclosed_el) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("empty policy shows empty list (no condition rows)", () => {
    const policy: SatisfactionPolicy = { all_of: [] };
    const { queryByLabelText } = render(
      <ConditionList policy={policy} on_change={() => {}} mode_flavor="general_personal" />,
    );
    // "Remove condition" buttons only appear when conditions exist
    expect(queryByLabelText("Remove condition")).toBeNull();
  });

  it("calls on_change when a condition is removed", () => {
    const on_change = vi.fn();
    const policy: SatisfactionPolicy = {
      all_of: [{ kind: "premise_attached" }],
    };
    const { getByLabelText } = render(
      <ConditionList policy={policy} on_change={on_change} mode_flavor="legal" />,
    );
    const remove_btn = getByLabelText("Remove condition");
    remove_btn.click();
    expect(on_change).toHaveBeenCalledWith({ all_of: [] });
  });

  it("renders all conditions from policy.all_of", () => {
    const policy: SatisfactionPolicy = {
      all_of: [{ kind: "premise_attached" }, { kind: "not_foreclosed" }],
    };
    const { getAllByLabelText } = render(
      <ConditionList policy={policy} on_change={() => {}} mode_flavor="legal" />,
    );
    expect(getAllByLabelText("Remove condition")).toHaveLength(2);
  });
});
