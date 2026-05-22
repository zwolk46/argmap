import type { ReactElement, ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "#components/ui/sidebar";

export interface ThreePaneLayoutProps {
  /** Top bar rendered inside SidebarInset. */
  top_bar?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  /**
   * In prototype 3 the right pane is rendered as a Sheet at the page
   * level (driven by selection state), not inside the layout. This prop
   * is accepted for prop-shape compat but not rendered here.
   */
  right?: ReactNode;
  bottom?: ReactNode | null;
  /**
   * Deprecated. Pixel-based width hints; unused by the shadcn layout.
   * Kept so existing callers don't fail typecheck.
   */
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

/**
 * Prototype 3 — hybrid:
 *   - LEFT pane: shadcn Sidebar variant="sidebar" collapsible="icon".
 *     Default-collapsed to an icon rail. ⌘B/Ctrl+B toggles between rail
 *     and full-width.
 *   - RIGHT pane: rendered as a shadcn Sheet at the page level (driven
 *     by node selection state), not inside this layout. When the user
 *     selects a node, the Sheet slides in from the right with the
 *     inspector; clicking off / hitting Esc closes it.
 */
export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const { top_bar, left, center, bottom = null } = props;

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
    >
      <Sidebar side="left" variant="sidebar" collapsible="icon">
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
    </SidebarProvider>
  );
}
