// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { StatusSummaryChip } from "@/ui/argument-running/status-summary-chip";

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useSessionStore: vi.fn(() => null),
  };
});

describe("StatusSummaryChip", () => {
  it("renders nothing when the selector returns null and no override is provided", () => {
    const { container } = render(<StatusSummaryChip />);
    expect(container.querySelector("[data-testid='status-summary-chip']")).toBeNull();
  });

  it("renders 'complete · {label}' for determinate shape", () => {
    const { getByTestId } = render(
      <StatusSummaryChip
        override={{
          shape: "determinate",
          resolved_count: 4,
          total_count: 4,
          conclusion_label: "Affirm",
        }}
      />,
    );
    const chip = getByTestId("status-summary-chip");
    expect(chip.textContent).toContain("complete");
    expect(chip.textContent).toContain("Affirm");
  });

  it("renders 'N/M resolved · tentative: {label}' for conditional shape", () => {
    const { getByTestId } = render(
      <StatusSummaryChip
        override={{
          shape: "conditional",
          resolved_count: 2,
          total_count: 5,
          conclusion_label: "Reverse",
        }}
      />,
    );
    expect(getByTestId("status-summary-chip").textContent).toContain("2/5 resolved");
    expect(getByTestId("status-summary-chip").textContent).toContain("Reverse");
  });

  it("renders 'indeterminate' for incomplete shape", () => {
    const { getByTestId } = render(
      <StatusSummaryChip
        override={{
          shape: "incomplete",
          resolved_count: 0,
          total_count: 0,
        }}
      />,
    );
    expect(getByTestId("status-summary-chip").textContent).toContain("indeterminate");
  });

  it("renders 'contested' for contested shape", () => {
    const { getByTestId } = render(
      <StatusSummaryChip
        override={{
          shape: "contested",
          resolved_count: 3,
          total_count: 5,
        }}
      />,
    );
    expect(getByTestId("status-summary-chip").textContent).toContain("contested");
  });
});
