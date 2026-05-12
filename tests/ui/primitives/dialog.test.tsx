// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Dialog, DialogHeader, DialogBody, DialogFooter } from "@/ui/primitives/dialog";

function TestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>Header</DialogHeader>
      <DialogBody><p>Body content</p></DialogBody>
      <DialogFooter><button onClick={onClose}>Close</button></DialogFooter>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("renders when open=true", () => {
    const { getByText } = render(<TestDialog open onClose={() => {}} />);
    expect(getByText("Body content")).toBeTruthy();
  });

  it("does not render when open=false", () => {
    const { queryByText } = render(<TestDialog open={false} onClose={() => {}} />);
    expect(queryByText("Body content")).toBeNull();
  });

  it("calls onClose on Escape key", () => {
    let closed = false;
    const { container } = render(<TestDialog open onClose={() => { closed = true; }} />);
    fireEvent.keyDown(container, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("calls onClose when clicking backdrop", () => {
    let closed = false;
    const { getByRole } = render(<TestDialog open onClose={() => { closed = true; }} />);
    const dialog = getByRole("dialog");
    // Click the dialog backdrop (the outer overlay, not the panel)
    const backdrop = dialog.parentElement;
    if (backdrop) fireEvent.click(backdrop);
    expect(closed).toBe(true);
  });
});
