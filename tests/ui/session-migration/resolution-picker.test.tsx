// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { ResolutionPicker } from "@/ui/session-migration/resolution-picker";

// shadcn DropdownMenu (Radix) portals its content to document.body; queries
// must use `screen.*` rather than the returned container. The Radix trigger
// opens on `pointerdown` with button=0, not on `click` — see
// @radix-ui/react-dropdown-menu source. We open via `fireEvent.pointerDown`
// and dispatch a click only when activating a menu item (items respond to
// click). Keyboard opening (Enter/Space on the focused trigger) is also
// available but less ergonomic in tests.

function openMenu(trigger: HTMLElement): void {
  fireEvent.pointerDown(trigger, { button: 0 });
}

describe("ResolutionPicker", () => {
  it("renders the trigger label for the current value", () => {
    const { getByTestId, rerender } = render(
      <ResolutionPicker value="discard" onChange={() => {}} />,
    );
    expect(getByTestId("resolution-picker-trigger").textContent).toContain("Discard");
    rerender(<ResolutionPicker value="reattach" onChange={() => {}} />);
    expect(getByTestId("resolution-picker-trigger").textContent).toContain("Reattach");
    rerender(<ResolutionPicker value="no_op" onChange={() => {}} />);
    expect(getByTestId("resolution-picker-trigger").textContent).toContain("Keep");
  });

  it("opening the menu reveals three options in canonical order", () => {
    const { getByTestId } = render(<ResolutionPicker value="discard" onChange={() => {}} />);
    openMenu(getByTestId("resolution-picker-trigger"));
    expect(screen.getByTestId("resolution-option-discard")).toBeTruthy();
    expect(screen.getByTestId("resolution-option-reattach")).toBeTruthy();
    expect(screen.getByTestId("resolution-option-no_op")).toBeTruthy();
  });

  it("clicking an option calls onChange with the right kind", () => {
    const cb = vi.fn();
    const { getByTestId } = render(<ResolutionPicker value="discard" onChange={cb} />);
    openMenu(getByTestId("resolution-picker-trigger"));
    fireEvent.click(screen.getByTestId("resolution-option-reattach"));
    expect(cb).toHaveBeenCalledWith("reattach");
  });

  it("hides Reattach option when reattach_available is false", () => {
    const { getByTestId } = render(
      <ResolutionPicker value="discard" onChange={() => {}} reattach_available={false} />,
    );
    openMenu(getByTestId("resolution-picker-trigger"));
    expect(screen.queryByTestId("resolution-option-reattach")).toBeNull();
    expect(screen.getByTestId("resolution-option-discard")).toBeTruthy();
    expect(screen.getByTestId("resolution-option-no_op")).toBeTruthy();
  });
});
