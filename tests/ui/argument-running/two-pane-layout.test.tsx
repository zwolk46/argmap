// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TwoPaneLayout } from "@/ui/argument-running/two-pane-layout";

describe("TwoPaneLayout", () => {
  it("renders left, right, and bottom children", () => {
    const { getByText, getByTestId } = render(
      <TwoPaneLayout left={<div>LEFT</div>} right={<div>RIGHT</div>} bottom={<div>BOTTOM</div>} />,
    );
    expect(getByTestId("argument-running-two-pane")).toBeTruthy();
    expect(getByText("LEFT")).toBeTruthy();
    expect(getByText("RIGHT")).toBeTruthy();
    expect(getByText("BOTTOM")).toBeTruthy();
  });

  it("omits the bottom row when bottom is null", () => {
    const { queryByText } = render(
      <TwoPaneLayout left={<div>L</div>} right={<div>R</div>} bottom={null} />,
    );
    expect(queryByText("BOTTOM")).toBeNull();
  });
});
