// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { PaneTabs } from "@/ui/version-history/pane-tabs";

describe("PaneTabs", () => {
  it("renders both labels", () => {
    const { getByText } = render(<PaneTabs value="sessions" onChange={() => {}} />);
    expect(getByText("Sessions")).toBeTruthy();
    expect(getByText("Frames (read-only)")).toBeTruthy();
  });

  it("clicking the inactive label calls onChange", () => {
    const onChange = vi.fn();
    const { getByText } = render(<PaneTabs value="sessions" onChange={onChange} />);
    fireEvent.click(getByText("Frames (read-only)"));
    expect(onChange).toHaveBeenCalledWith("frames");
  });
});
