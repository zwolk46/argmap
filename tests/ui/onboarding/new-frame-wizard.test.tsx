// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { NewFrameWizard } from "@/ui/onboarding";

describe("NewFrameWizard", () => {
  it("Submit is disabled until mode + (flavor for general) + title", () => {
    const { getByTestId } = render(<NewFrameWizard onSubmit={() => {}} onCancel={() => {}} />);
    const submit = getByTestId("wizard-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(getByTestId("wizard-mode-legal"));
    expect(submit.disabled).toBe(true); // still no title
    fireEvent.change(getByTestId("wizard-title-input"), { target: { value: "My Frame" } });
    expect(submit.disabled).toBe(false);
  });

  it("emits legal mode submit with title only (no flavor)", () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NewFrameWizard onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(getByTestId("wizard-mode-legal"));
    fireEvent.change(getByTestId("wizard-title-input"), { target: { value: "Smith v Jones" } });
    fireEvent.click(getByTestId("wizard-submit"));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Smith v Jones",
      description: undefined,
      mode: "legal",
      flavor: undefined,
    });
  });

  it("emits general mode submit with flavor", () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<NewFrameWizard onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(getByTestId("wizard-mode-general"));
    fireEvent.click(getByTestId("wizard-flavor-academic"));
    fireEvent.change(getByTestId("wizard-title-input"), { target: { value: "Free Will" } });
    fireEvent.change(getByTestId("wizard-description-input"), {
      target: { value: "Compatibilism vs libertarianism" },
    });
    fireEvent.click(getByTestId("wizard-submit"));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Free Will",
      description: "Compatibilism vs libertarianism",
      mode: "general",
      flavor: "academic",
    });
  });
});
