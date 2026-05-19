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

  // P0-24 regression: a closed Drawer's content is still in DOM (so the
  // slide-out transition works), but it must not be reachable via Tab.
  it("applies `inert` to the root when closed, removing children from the tab order", () => {
    const { container } = render(<TestDrawer open={false} />);
    const drawer = container.querySelector("[data-testid='drawer']") as HTMLElement;
    expect(drawer.hasAttribute("inert")).toBe(true);
  });

  it("does NOT apply `inert` when open", () => {
    const { container } = render(<TestDrawer open />);
    const drawer = container.querySelector("[data-testid='drawer']") as HTMLElement;
    expect(drawer.hasAttribute("inert")).toBe(false);
  });

  // §9 #25: opt-in backdrop scrim + click-outside-to-dismiss.
  it("does not render a backdrop by default", () => {
    const { container } = render(<TestDrawer open />);
    expect(container.querySelector("[data-testid='drawer-backdrop']")).toBeNull();
  });

  it("renders a backdrop when show_backdrop=true", () => {
    const { container } = render(
      <Drawer open show_backdrop>
        <DrawerBody>
          <p data-testid="drawer-body">Drawer body</p>
        </DrawerBody>
      </Drawer>,
    );
    const backdrop = container.querySelector(
      "[data-testid='drawer-backdrop']",
    ) as HTMLElement | null;
    expect(backdrop).not.toBeNull();
    expect(backdrop?.getAttribute("data-open")).toBe("true");
  });

  it("calls onClose when the backdrop is clicked while open", () => {
    let closed = false;
    const { container } = render(
      <Drawer
        open
        show_backdrop
        onClose={() => {
          closed = true;
        }}
      >
        <DrawerBody>
          <p>body</p>
        </DrawerBody>
      </Drawer>,
    );
    const backdrop = container.querySelector("[data-testid='drawer-backdrop']") as HTMLElement;
    fireEvent.click(backdrop);
    expect(closed).toBe(true);
  });

  it("does NOT call onClose when the backdrop is clicked while closed", () => {
    let closed = false;
    const { container } = render(
      <Drawer
        open={false}
        show_backdrop
        onClose={() => {
          closed = true;
        }}
      >
        <DrawerBody>
          <p>body</p>
        </DrawerBody>
      </Drawer>,
    );
    const backdrop = container.querySelector("[data-testid='drawer-backdrop']") as HTMLElement;
    fireEvent.click(backdrop);
    expect(closed).toBe(false);
  });
});
