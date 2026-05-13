// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MilestoneFilter } from "@/ui/version-history/milestone-filter";

describe("MilestoneFilter", () => {
  it("renders both pills with correct aria-pressed states for 'all'", () => {
    const { getByTestId } = render(<MilestoneFilter value="all" onChange={() => {}} />);
    expect(getByTestId("milestone-filter-all").getAttribute("aria-pressed")).toBe("true");
    expect(getByTestId("milestone-filter-milestones").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("clicking the inactive pill calls onChange with the other value", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<MilestoneFilter value="all" onChange={onChange} />);
    fireEvent.click(getByTestId("milestone-filter-milestones"));
    expect(onChange).toHaveBeenCalledWith("milestones_only");
  });

  it("has tooltip hint strings on each pill", () => {
    const { getByTestId } = render(<MilestoneFilter value="all" onChange={() => {}} />);
    expect(getByTestId("milestone-filter-all").getAttribute("title")).toBe(
      "Show every saved version including auto-saves",
    );
    expect(getByTestId("milestone-filter-milestones").getAttribute("title")).toBe(
      "Hide auto-saves",
    );
  });
});
