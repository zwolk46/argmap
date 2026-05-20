// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TargetModePicker } from "@/ui/mode-change/target-mode-picker";

describe("TargetModePicker", () => {
  it("shows current=legal, target=general (personal default) with flavor sub-radios", () => {
    const { getByTestId } = render(
      <TargetModePicker
        current_mode="legal"
        current_flavor={undefined}
        target_mode="general"
        target_flavor="personal"
        onTargetFlavorChanged={() => {}}
      />,
    );
    expect(getByTestId("target-mode-current").textContent).toBe("legal");
    expect(getByTestId("target-mode-target").textContent).toBe("general (personal)");
    expect(getByTestId("target-flavor-fieldset")).toBeTruthy();
  });

  it("hides flavor fieldset when target=legal", () => {
    const { queryByTestId } = render(
      <TargetModePicker
        current_mode="general"
        current_flavor="personal"
        target_mode="legal"
        target_flavor={undefined}
        onTargetFlavorChanged={() => {}}
      />,
    );
    expect(queryByTestId("target-flavor-fieldset")).toBeNull();
  });

  it("flavor selection fires onTargetFlavorChanged", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <TargetModePicker
        current_mode="legal"
        current_flavor={undefined}
        target_mode="general"
        target_flavor="personal"
        onTargetFlavorChanged={onChange}
      />,
    );
    // shadcn RadioGroupItem is rendered as a button inside a Label radio
    // card. Clicking the Label dispatches a click to the button via the
    // htmlFor association, which is the user-facing interaction.
    fireEvent.click(getByTestId("target-flavor-academic"));
    expect(onChange).toHaveBeenCalledWith("academic");
  });
});
