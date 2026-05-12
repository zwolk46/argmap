// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ValidationIndicator } from "@/ui/chrome/validation-indicator";
import type { ValidationResult } from "@/schema";

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: { validation: ValidationResult[] }) => unknown) =>
      selector({ validation: FRAME_VALIDATION }),
    ),
    useSessionStore: vi.fn((selector: (s: { compute_result: { validation_results: ValidationResult[] } | null }) => unknown) =>
      selector({ compute_result: { validation_results: SESSION_VALIDATION } }),
    ),
  };
});

const FRAME_VALIDATION: ValidationResult[] = [
  { rule_id: "r1", node_id: "n1", severity: "error", message: "Frame error" },
];

const SESSION_VALIDATION: ValidationResult[] = [
  { rule_id: "r2", node_id: "n2", severity: "warning", message: "Session warning" },
];

describe("ValidationIndicator", () => {
  it("renders for frame_building surface", () => {
    const { container } = render(<ValidationIndicator surface="frame_building" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("calls onOpenDrawer with validation list on click", () => {
    const onOpenDrawer = vi.fn();
    const { getByRole } = render(
      <ValidationIndicator surface="frame_building" onOpenDrawer={onOpenDrawer} />,
    );
    const btn = getByRole("button");
    fireEvent.click(btn);
    expect(onOpenDrawer).toHaveBeenCalledWith(FRAME_VALIDATION);
  });

  it("renders for argument_running surface", () => {
    const { container } = render(<ValidationIndicator surface="argument_running" />);
    expect(container.firstChild).toBeTruthy();
  });
});
