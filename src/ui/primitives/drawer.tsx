import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "#lib/utils";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  dismiss_on_escape?: boolean;
  // §9 #25: opt-in semi-transparent backdrop + click-outside-to-dismiss.
  // The legacy drawer rendered NO scrim by default — only opt-in side panels
  // (HelpGlossaryPane, SessionSettingsPanel) dimmed the background. We
  // preserve that here: when show_backdrop=false, the overlay is fully
  // transparent and pointer-pass-through; the Radix focus-guard role still
  // applies (so Tab won't escape into the canvas), but the page beneath
  // stays visually live. When show_backdrop=true, the overlay renders the
  // standard dim scrim AND dismisses on pointer-outside.
  show_backdrop?: boolean;
  width?: string;
  height?: string;
  side?: DrawerSide;
  aria_label?: string;
  children: ReactNode;
}

export function DrawerHeader({ children }: { children: ReactNode }): ReactElement {
  return (
    // Radix Dialog requires a Title for SR labelling. The argmap drawer
    // ships its own visible title row; wrap it as the Radix Title so the
    // accessible name surfaces without a separate VisuallyHidden block.
    <DialogPrimitive.Title
      data-slot="argmap-drawer-header"
      className="px-5 py-4 border-b text-lg font-semibold text-[var(--color-text-primary)] flex items-center justify-between m-0"
    >
      {children}
    </DialogPrimitive.Title>
  );
}

export function DrawerBody({ children }: { children: ReactNode }): ReactElement {
  return (
    <div data-slot="argmap-drawer-body" className="px-5 py-4 overflow-y-auto flex-1">
      {children}
    </div>
  );
}

export function DrawerFooter({ children }: { children: ReactNode }): ReactElement {
  return (
    <div data-slot="argmap-drawer-footer" className="px-5 py-3 border-t flex gap-2 justify-end">
      {children}
    </div>
  );
}

const SIDE_STATIC: Record<DrawerSide, string> = {
  right:
    "top-0 right-0 bottom-0 h-full border-l data-open:animate-in data-closed:animate-out data-open:slide-in-from-right data-closed:slide-out-to-right",
  left: "top-0 left-0 bottom-0 h-full border-r data-open:animate-in data-closed:animate-out data-open:slide-in-from-left data-closed:slide-out-to-left",
  bottom:
    "left-0 right-0 bottom-0 w-full border-t data-open:animate-in data-closed:animate-out data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
};

export function Drawer({
  open,
  onClose,
  dismiss_on_escape = true,
  show_backdrop = false,
  width,
  height,
  side = "right",
  aria_label,
  children,
}: DrawerProps): ReactElement {
  const sizeStyle: React.CSSProperties = {};
  if (side === "left" || side === "right") {
    if (width) sizeStyle.width = width;
    else sizeStyle.width = "360px";
  } else if (side === "bottom") {
    if (height) sizeStyle.height = height;
    else sizeStyle.height = "260px";
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="drawer-overlay"
          data-backdrop={show_backdrop ? "true" : "false"}
          className={cn(
            "fixed inset-0 z-50 duration-100",
            // When show_backdrop is on, render the standard dim scrim.
            // When off, keep the element in the tree (Radix needs it for
            // the portal layer) but make it fully transparent and let
            // pointer events fall through so the page underneath stays
            // live — matching the legacy "no scrim" default.
            show_backdrop
              ? "bg-black/40 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              : "bg-transparent pointer-events-none",
          )}
        />
        <DialogPrimitive.Content
          data-slot="drawer-content"
          data-testid="drawer"
          data-open={open ? "true" : "false"}
          data-side={side}
          aria-label={aria_label}
          style={sizeStyle}
          onEscapeKeyDown={(e) => {
            if (!dismiss_on_escape) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!show_backdrop) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!show_backdrop) e.preventDefault();
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-lg outline-none",
            SIDE_STATIC[side],
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
