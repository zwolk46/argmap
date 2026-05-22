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
          <SidebarHeader className="flex flex-row items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
              Palette
            </span>
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
        <RightPane
          open={right_open}
          on_close={() => set_right_open(false)}
          width={RIGHT_PANE_WIDTH}
        >
          {right}
        </RightPane>
        {!right_open ? (
          <RightReopenStrip on_click={() => set_right_open(true)} />
        ) : null}
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

interface RightPaneProps {
  open: boolean;
  on_close: () => void;
  width: string;
  children: ReactNode;
}

function RightPane(props: RightPaneProps): ReactElement | null {
  const { open, on_close, width, children } = props;
  if (!open) return null;
  return (
    <aside
      data-pane="right"
      className="shrink-0 p-2 transition-[width] duration-200 ease-linear"
      style={{ width }}
    >
      <div
        className="flex h-full flex-col overflow-hidden rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm"
        style={{ height: `calc(100svh - ${TOPBAR_HEIGHT_PX}px - 1rem)` }}
      >
        <header className="flex flex-row items-center justify-between gap-2 p-2">
          <span className="text-sm font-medium">Inspector</span>
          <button
            type="button"
            onClick={on_close}
            aria-label="Close inspector"
            title="Close inspector"
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <SidebarSimple size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">{children}</div>
      </div>
    </aside>
  );
}

/**
 * Always-present vertical tab strip on the right viewport edge. Reads
 * "Inspector" rotated 90°, low-contrast, expands when clicked.
 */
function RightReopenStrip(props: { on_click: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={props.on_click}
      aria-label="Open inspector"
      title="Open inspector"
      style={{
        position: "fixed",
        top: `calc(${TOPBAR_HEIGHT_REM} + 1rem)`,
        right: "0.5rem",
        height: "8rem",
        zIndex: 20,
      }}
      className="flex w-7 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-border bg-card text-foreground/60 shadow-sm hover:text-foreground"
    >
      <SidebarSimple size={14} />
      <span
        className="text-xs font-medium tracking-wide"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Inspector
      </span>
    </button>
  );
}
