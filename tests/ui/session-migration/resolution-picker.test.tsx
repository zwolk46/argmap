// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ResolutionPicker } from "@/ui/session-migration/resolution-picker";

describe("ResolutionPicker", () => {
  it("renders three options in canonical order", () => {
    const { getByText } = render(<ResolutionPicker value="discard" onChange={() => {}} />);
    expect(getByText("Discard")).toBeTruthy();
    expect(getByText("Reattach")).toBeTruthy();
    expect(getByText("Keep")).toBeTruthy();
  });

  it("clicking an option calls onChange with the right kind", () => {
    const cb = vi.fn();
    const { getByText } = render(<ResolutionPicker value="discard" onChange={cb} />);
    fireEvent.click(getByText("Reattach"));
    expect(cb).toHaveBeenCalledWith("reattach");
  });
});
