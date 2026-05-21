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
  // shadcn / Radix Sheet portals + conditionally mounts on open. Tests below
  // were updated from the legacy hand-rolled drawer (always-mounted with
  // `inert`) to the portal model. Behavioral guarantees that survived:
  //   • body renders when open
  //   • Escape calls onClose (dismiss_on_escape)
  //   • backdrop scrim (show_backdrop) dismisses via pointer outside
  //   • the drawer carries data-side / data-open / data-testid="drawer"
  it("renders body when open", () => {
    const { getByTestId } = render(<TestDrawer open />);
    expect(getByTestId("drawer-body")).toBeTruthy();
  });

  it("does NOT render body when closed (Radix Sheet portals + unmounts)", () => {
    const { queryByTestId } = render(<TestDrawer open={false} />);
    expect(queryByTestId("drawer-body")).toBeNull();
  });

  it("carries data-open=true on the drawer panel when open", () => {
    const { getByTestId } = render(<TestDrawer open />);
    expect(getByTestId("drawer").getAttribute("data-open")).toBe("true");
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

  // §9 #25: opt-in backdrop scrim + click-outside-to-dismiss.
  it("does not dismiss on pointer-outside by default (show_backdrop=false)", () => {
    let closed = false;
    const { container } = render(
      <Drawer
        open
        onClose={() => {
          closed = true;
        }}
      >
        <DrawerBody>
          <p>body</p>
        </DrawerBody>
      </Drawer>,
    );
    const overlay = container.ownerDocument.querySelector(
      "[data-slot='drawer-overlay']",
    ) as HTMLElement | null;
    if (overlay) fireEvent.pointerDown(overlay);
    expect(closed).toBe(false);
  });

  it("renders a scrim-styled overlay when show_backdrop=true", () => {
    const { container } = render(
      <Drawer open show_backdrop>
        <DrawerBody>
          <p data-testid="drawer-body">Drawer body</p>
        </DrawerBody>
      </Drawer>,
    );
    const overlay = container.ownerDocument.querySelector(
      "[data-slot='drawer-overlay']",
    ) as HTMLElement | null;
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute("data-backdrop")).toBe("true");
  });

  it("renders a transparent overlay when show_backdrop=false (legacy no-scrim default)", () => {
    const { container } = render(
      <Drawer open>
        <DrawerBody>
          <p>body</p>
        </DrawerBody>
      </Drawer>,
    );
    const overlay = container.ownerDocument.querySelector(
      "[data-slot='drawer-overlay']",
    ) as HTMLElement | null;
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute("data-backdrop")).toBe("false");
  });

  it("does NOT render the overlay when drawer is closed", () => {
    const { container } = render(
      <Drawer open={false} show_backdrop>
        <DrawerBody>
          <p>body</p>
        </DrawerBody>
      </Drawer>,
    );
    const overlay = container.ownerDocument.querySelector("[data-slot='drawer-overlay']");
    expect(overlay).toBeNull();
  });
});
