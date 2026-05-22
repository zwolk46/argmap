import type { ReactElement, ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "#components/ui/sidebar";

export interface ThreePaneLayoutProps {
  /** Top bar rendered inside SidebarInset so the inset-card treatment
   *  wraps the topbar plus the canvas as one unit. */
  top_bar?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  /**
   * Deprecated. Pixel-based width hints from the pre-resizable layout.
   * Unused by the new shadcn Sidebar layout (Sidebar manages its own
   * width). Kept so existing callers don't fail typecheck.
   */
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

/**
 * Prototype 1 — shadcn Sidebar with variant="inset" + collapsible="offcanvas".
 *
 * Layout:
 *   - LEFT Sidebar (inset, offcanvas)
 *   - SidebarInset (rounded card, contains TopBar + center canvas + bottom)
 *   - RIGHT Sidebar (inset, offcanvas)
 *
 * Both sidebars share the SidebarProvider state, so ⌘B / Ctrl+B toggles
 * BOTH simultaneously. For a final implementation, two providers (or a
 * custom controlled provider) would split the toggles.
 */
export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const { top_bar, left, center, right, bottom = null } = props;

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
    >
      <Sidebar side="left" variant="inset" collapsible="offcanvas">
        <SidebarContent>{left}</SidebarContent>
      </Sidebar>
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        {top_bar}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
            {center}
          </div>
          {bottom ? (
            <div className="shrink-0 overflow-hidden border-t border-border bg-card shadow-sm">
              {bottom}
            </div>
          ) : null}
        </div>
      </SidebarInset>
      <Sidebar side="right" variant="inset" collapsible="offcanvas">
        <SidebarContent>{right}</SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
