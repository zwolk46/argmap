// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ConditionPicker } from "@/ui/frame-building/right-pane/condition-picker";
import { OFFERED_CONDITIONS_BY_MODE_FLAVOR, CONDITION_KIND_PRIORITY } from "@/schema";

describe("ConditionPicker", () => {
  it("under legal mode_flavor, all condition kinds from OFFERED_CONDITIONS_BY_MODE_FLAVOR['legal'] are offered", () => {
    const on_pick = vi.fn();
    const { getByRole, getAllByRole } = render(
      <ConditionPicker mode_flavor="legal" exclude_kinds={new Set()} on_pick={on_pick} />,
    );

    // Open the dropdown
    fireEvent.click(getByRole("button", { name: /Add condition/ }));

    const menu_items = getAllByRole("menuitem");
    const offered = OFFERED_CONDITIONS_BY_MODE_FLAVOR["legal"];
    expect(menu_items.length).toBe(offered.length);
  });

  it("under legal mode_flavor, 12 condition kinds are offered (full set)", () => {
    const { getByRole, getAllByRole } = render(
      <ConditionPicker mode_flavor="legal" exclude_kinds={new Set()} on_pick={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: /Add condition/ }));
    const menu_items = getAllByRole("menuitem");
    expect(menu_items.length).toBe(CONDITION_KIND_PRIORITY.length);
  });

  it("under general_personal, authority conditions are excluded", () => {
    const { getByRole, getAllByRole } = render(
      <ConditionPicker
        mode_flavor="general_personal"
        exclude_kinds={new Set()}
        on_pick={() => {}}
      />,
    );
    fireEvent.click(getByRole("button", { name: /Add condition/ }));
    const menu_items = getAllByRole("menuitem");
    const labels = menu_items.map((el) => el.textContent ?? "");
    expect(labels.some((l) => l.includes("Authority"))).toBe(false);
  });

  it("exclude_kinds filters out listed kinds", () => {
    const exclude = new Set<import("@/schema").ConditionKind>(["premise_attached"]);
    const { getByRole, getAllByRole } = render(
      <ConditionPicker mode_flavor="legal" exclude_kinds={exclude} on_pick={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: /Add condition/ }));
    const menu_items = getAllByRole("menuitem");
    const labels = menu_items.map((el) => el.textContent ?? "");
    expect(labels.some((l) => l.includes("Premise attached"))).toBe(false);
    // Should have one fewer item
    expect(menu_items.length).toBe(OFFERED_CONDITIONS_BY_MODE_FLAVOR["legal"].length - 1);
  });

  it("calls on_pick with the selected kind", () => {
    const on_pick = vi.fn();
    const { getByRole } = render(
      <ConditionPicker mode_flavor="legal" exclude_kinds={new Set()} on_pick={on_pick} />,
    );
    fireEvent.click(getByRole("button", { name: /Add condition/ }));
    const first_item = getByRole("menuitem", { name: /Premise attached/ });
    fireEvent.click(first_item);
    expect(on_pick).toHaveBeenCalledWith("premise_attached");
  });

  it("shows 'All conditions already added' when all kinds are excluded", () => {
    const all_kinds = new Set(OFFERED_CONDITIONS_BY_MODE_FLAVOR["legal"]);
    const { getByRole, getByText } = render(
      <ConditionPicker mode_flavor="legal" exclude_kinds={all_kinds} on_pick={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: /Add condition/ }));
    expect(getByText(/All conditions already added/)).toBeTruthy();
  });
});
