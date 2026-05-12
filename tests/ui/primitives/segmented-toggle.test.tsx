// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { SegmentedToggle } from "@/ui/primitives/segmented-toggle";

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("SegmentedToggle", () => {
  it("renders all options", () => {
    const { getByText } = render(
      <SegmentedToggle value="a" options={OPTIONS} onChange={() => {}} />,
    );
    expect(getByText("Option A")).toBeTruthy();
    expect(getByText("Option B")).toBeTruthy();
    expect(getByText("Option C")).toBeTruthy();
  });

  it("calls onChange when an option is clicked", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <SegmentedToggle value="a" options={OPTIONS} onChange={onChange} />,
    );
    fireEvent.click(getByText("Option B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("calls onChange with current value when the active option is clicked", () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <SegmentedToggle value="a" options={OPTIONS} onChange={onChange} />,
    );
    fireEvent.click(getByText("Option A"));
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("marks selected option with aria-checked=true", () => {
    const { getByText } = render(
      <SegmentedToggle value="b" options={OPTIONS} onChange={() => {}} />,
    );
    const btn = getByText("Option B").closest("[role='radio']");
    expect(btn?.getAttribute("aria-checked")).toBe("true");
  });
});
