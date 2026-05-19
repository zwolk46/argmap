// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { OperatingModeToggle } from "@/ui/chrome/operating-mode-toggle";
import type { ValidationResult } from "@/schema";

describe("OperatingModeToggle", () => {
  it("dispatches onSwitchToArgument when no validation issues and in frame mode", () => {
    const onSwitchToArgument = vi.fn();
    const { getByText } = render(
      <OperatingModeToggle
        current_mode="frame_building"
        validation={[]}
        onSwitchToArgument={onSwitchToArgument}
        onSwitchToFrame={() => {}}
        onSwitchWithWarnings={() => {}}
        onValidationBlocked={() => {}}
      />,
    );
    fireEvent.click(getByText("Argument"));
    expect(onSwitchToArgument).toHaveBeenCalled();
  });

  it("calls onValidationBlocked with error list when there are errors", () => {
    const onValidationBlocked = vi.fn();
    const errors: ValidationResult[] = [
      { rule_id: "r1", node_id: "n1", severity: "error", message: "Error!" },
    ];
    const { getByText } = render(
      <OperatingModeToggle
        current_mode="frame_building"
        validation={errors}
        onSwitchToArgument={() => {}}
        onSwitchToFrame={() => {}}
        onSwitchWithWarnings={() => {}}
        onValidationBlocked={onValidationBlocked}
      />,
    );
    fireEvent.click(getByText("Argument"));
    expect(onValidationBlocked).toHaveBeenCalledWith(errors);
  });

  it("shows warning dialog when there are only warnings", () => {
    const warnings: ValidationResult[] = [
      { rule_id: "r1", node_id: "n1", severity: "warning", message: "Warn!" },
    ];
    const { getByText, queryByRole } = render(
      <OperatingModeToggle
        current_mode="frame_building"
        validation={warnings}
        onSwitchToArgument={() => {}}
        onSwitchToFrame={() => {}}
        onSwitchWithWarnings={() => {}}
        onValidationBlocked={() => {}}
      />,
    );
    fireEvent.click(getByText("Argument"));
    expect(queryByRole("dialog")).toBeTruthy();
  });

  it("dispatches onSwitchWithWarnings when confirming warning dialog", () => {
    const onSwitchWithWarnings = vi.fn();
    const warnings: ValidationResult[] = [
      { rule_id: "r1", node_id: "n1", severity: "warning", message: "Warn!" },
    ];
    const { getByText } = render(
      <OperatingModeToggle
        current_mode="frame_building"
        validation={warnings}
        onSwitchToArgument={() => {}}
        onSwitchToFrame={() => {}}
        onSwitchWithWarnings={onSwitchWithWarnings}
        onValidationBlocked={() => {}}
      />,
    );
    fireEvent.click(getByText("Argument"));
    fireEvent.click(getByText("Switch anyway"));
    expect(onSwitchWithWarnings).toHaveBeenCalled();
  });

  it("dispatches onSwitchToFrame from argument_running mode", () => {
    const onSwitchToFrame = vi.fn();
    const { getByText } = render(
      <OperatingModeToggle
        current_mode="argument_running"
        validation={[]}
        onSwitchToArgument={() => {}}
        onSwitchToFrame={onSwitchToFrame}
        onSwitchWithWarnings={() => {}}
        onValidationBlocked={() => {}}
      />,
    );
    fireEvent.click(getByText("Frame"));
    expect(onSwitchToFrame).toHaveBeenCalled();
  });
});
