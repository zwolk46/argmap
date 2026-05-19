// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ValidationIndicator } from "@/ui/chrome/validation-indicator";
import type { ValidationResult } from "@/schema";

let FRAME_VALIDATION: ValidationResult[] = [];
const SESSION_VALIDATION: ValidationResult[] = [
  { rule_id: "r2", node_id: "n2", severity: "warning", message: "Session warning" },
];

vi.mock("@/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state")>();
  return {
    ...actual,
    useFrameStore: vi.fn((selector: (s: { validation: ValidationResult[] }) => unknown) =>
      selector({ validation: FRAME_VALIDATION }),
    ),
    useSessionStore: vi.fn(
      (
        selector: (s: {
          compute_result: { validation_results: ValidationResult[] } | null;
        }) => unknown,
      ) => selector({ compute_result: { validation_results: SESSION_VALIDATION } }),
    ),
  };
});

describe("ValidationIndicator", () => {
  it("renders for frame_building surface", () => {
    FRAME_VALIDATION = [{ rule_id: "r1", node_id: "n1", severity: "error", message: "x" }];
    const { container } = render(<ValidationIndicator surface="frame_building" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("calls onOpenDrawer with validation list on click", () => {
    FRAME_VALIDATION = [{ rule_id: "r1", node_id: "n1", severity: "error", message: "x" }];
    const onOpenDrawer = vi.fn();
    const { getByRole } = render(
      <ValidationIndicator surface="frame_building" onOpenDrawer={onOpenDrawer} />,
    );
    const btn = getByRole("button");
    fireEvent.click(btn);
    expect(onOpenDrawer).toHaveBeenCalledWith(FRAME_VALIDATION);
  });

  it("renders for argument_running surface", () => {
    FRAME_VALIDATION = [];
    const { container } = render(<ValidationIndicator surface="argument_running" />);
    expect(container.firstChild).toBeTruthy();
  });

  describe("§9 #12 — split error/warning labels", () => {
    it("shows '1 error' for a single error", () => {
      FRAME_VALIDATION = [{ rule_id: "r1", node_id: "n1", severity: "error", message: "x" }];
      const { getByTestId } = render(<ValidationIndicator surface="frame_building" />);
      expect(getByTestId("validation-indicator").textContent).toContain("1 error");
    });

    it("pluralizes errors", () => {
      FRAME_VALIDATION = [
        { rule_id: "r1", node_id: "n1", severity: "error", message: "x" },
        { rule_id: "r2", node_id: "n2", severity: "error", message: "y" },
      ];
      const { getByTestId } = render(<ValidationIndicator surface="frame_building" />);
      expect(getByTestId("validation-indicator").textContent).toContain("2 errors");
    });

    it("shows both counts when errors and warnings coexist", () => {
      FRAME_VALIDATION = [
        { rule_id: "r1", node_id: "n1", severity: "error", message: "x" },
        { rule_id: "r2", node_id: "n2", severity: "warning", message: "y" },
        { rule_id: "r3", node_id: "n3", severity: "warning", message: "z" },
      ];
      const { getByTestId } = render(<ValidationIndicator surface="frame_building" />);
      const text = getByTestId("validation-indicator").textContent ?? "";
      expect(text).toContain("1 error");
      expect(text).toContain("2 warnings");
    });

    it("shows 'No issues' when validation is empty", () => {
      FRAME_VALIDATION = [];
      const { getByTestId } = render(<ValidationIndicator surface="frame_building" />);
      expect(getByTestId("validation-indicator").textContent).toContain("No issues");
    });
  });
});
