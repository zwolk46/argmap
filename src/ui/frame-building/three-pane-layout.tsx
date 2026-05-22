import type { ReactElement, ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "#components/ui/sidebar";

export interface ThreePaneLayoutProps {
  /** Top bar rendered inside SidebarInset so the inset/floating sidebars
   *  feel detached from the topbar. */
  top_bar?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  /**
   * Deprecated. Pixel-based width hints from the pre-resizable layout.
   * Unused by the shadcn Sidebar layout. Kept so existing callers
   * don't fail typecheck.
   */
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

/**
 * Prototype 2 — shadcn Sidebar with variant="floating" + collapsible="icon".
 *
 * Panels are detached cards with shadow, never flush to edges. Collapse to
 * a ~48px icon rail (3rem) rather than fully sliding off-screen.
 *
 * ⌘B / Ctrl+B toggles between expanded + icon (built-in shortcut, affects
 * both sides simultaneously due to shared SidebarProvider state).
 */
export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const { top_bar, left, center, right, bottom = null } = props;

  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
    >
      <Sidebar side="left" variant="floating" collapsible="icon">
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
      <Sidebar side="right" variant="floating" collapsible="icon">
        <SidebarContent>{right}</SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
