import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { SidebarSimple } from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "#components/ui/sidebar";
import { RightPaneAnimated } from "./right-pane-animated";

export interface ThreePaneLayoutProps {
  top_bar?: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

const TOPBAR_HEIGHT_PX = 48;
const TOPBAR_HEIGHT_REM = "3rem";
const RIGHT_PANE_WIDTH = "20rem";

/**
 * Panel layout with a floating shadcn Sidebar on the left (collapsible to
 * icon rail, ⌘B toggles) and a custom right pane with an always-present
 * "Inspector" vertical strip reopen affordance.
 */
export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const { top_bar, left, center, right, bottom = null } = props;
  const [right_open, set_right_open] = React.useState(true);

  return (
    <SidebarProvider
      defaultOpen={true}
      className="!flex-col"
      style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
    >
      {top_bar}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          side="left"
          variant="floating"
          collapsible="icon"
          style={{
            top: TOPBAR_HEIGHT_REM,
            height: `calc(100svh - ${TOPBAR_HEIGHT_REM})`,
          }}
        >
          <SidebarHeader className="flex flex-row items-center justify-end gap-2 group-data-[collapsible=icon]:justify-center">
            <LeftSidebarToggle />
          </SidebarHeader>
          <SidebarContent>{left}</SidebarContent>
        </Sidebar>
        <SidebarInset
          className="flex flex-col overflow-hidden"
          style={{ height: `calc(100svh - ${TOPBAR_HEIGHT_PX}px)` }}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
            {center}
          </div>
          {bottom ? (
            <div className="shrink-0 overflow-hidden border-t border-border bg-card shadow-sm">
              {bottom}
            </div>
          ) : null}
        </SidebarInset>
        <RightPaneAnimated
          open={right_open}
          on_close={() => set_right_open(false)}
          on_open={() => set_right_open(true)}
          width={RIGHT_PANE_WIDTH}
        >
          {right}
        </RightPaneAnimated>
      </div>
    </SidebarProvider>
  );
}

function LeftSidebarToggle(): ReactElement {
  const { toggleSidebar, state } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
      title="Toggle sidebar (⌘B)"
      className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
    >
      <SidebarSimple size={16} />
    </button>
  );
}

