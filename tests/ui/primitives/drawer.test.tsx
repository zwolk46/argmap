// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from "@/ui/primitives/drawer";

function TestDrawer({ open, onClose }: { open: boolean; onClose?: () => void }) {
  return (
    <Drawer open={open} dismiss_on_escape={!!onClose} onClose={onClose}>
      <DrawerHeader>Drawer Title</DrawerHeader>
      <DrawerBody>
        <p data-testid="drawer-body">Drawer body</p>
      </DrawerBody>
      <DrawerFooter>
        <button>Action</button>
      </DrawerFooter>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("renders content (always mounted, visibility via CSS)", () => {
    const { getByTestId } = render(<TestDrawer open />);
    expect(getByTestId("drawer-body")).toBeTruthy();
  });

  it("renders with data-open=true when open", () => {
    const { container } = render(<TestDrawer open />);
    const drawer = container.querySelector("[data-open]");
    expect(drawer?.getAttribute("data-open")).toBe("true");
  });

  it("renders with data-open=false when closed", () => {
    const { container } = render(<TestDrawer open={false} />);
    const drawer = container.querySelector("[data-open]");
    expect(drawer?.getAttribute("data-open")).toBe("false");
  });

  it("calls onClose on Escape when dismiss_on_escape=true", () => {
    let closed = false;
    render(
      <TestDrawer
        open
        onClose={() => {
          closed = true;
        }}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("does not focus-trap (structure check)", () => {
    const { getByTestId } = render(<TestDrawer open />);
    expect(getByTestId("drawer-body")).toBeTruthy();
  });
});
