import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { SidebarSimple } from "@phosphor-icons/react";

const TOPBAR_HEIGHT_PX = 48;
const TOPBAR_HEIGHT_REM = "3rem";

export interface RightPaneAnimatedProps {
  open: boolean;
  on_close: () => void;
  on_open: () => void;
  width: string;
  children: ReactNode;
}

// VARIANT C — "scale-from-strip reveal"
// The pane unfolds from the right viewport edge: transform-origin: right,
// scaleX 0 → 1 with a slight overshoot, while the underlying width
// transitions in unison. On close the surface scales back into the strip
// and the reopen tab pulses in. translateX provides an extra slide hint
// so the motion reads as "into / out of the right edge".
const ANIM_MS = 280;

function useDelayedUnmount(open: boolean, delay: number): boolean {
  const [mounted, setMounted] = React.useState(open);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), delay);
    return () => window.clearTimeout(t);
  }, [open, delay]);
  return mounted;
}

export function RightPaneAnimated(props: RightPaneAnimatedProps): ReactElement {
  const { open, on_close, on_open, width, children } = props;
  const mounted = useDelayedUnmount(open, ANIM_MS);

  return (
    <React.Fragment>
      {mounted ? (
        <aside
          data-pane="right"
          data-state={open ? "open" : "closed"}
          style={{
            width: open ? width : "0px",
            transition: `width ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
          className="shrink-0 overflow-visible p-2 data-[state=closed]:p-0"
        >
          <div
            data-state={open ? "open" : "closed"}
            style={{
              height: `calc(100svh - ${TOPBAR_HEIGHT_PX}px - 1rem)`,
              transformOrigin: "right center",
              transform: open
                ? "scaleX(1) translateX(0)"
                : "scaleX(0.4) translateX(40px)",
              opacity: open ? 1 : 0,
              transition: `transform ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${ANIM_MS}ms ease-out`,
            }}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg"
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
      ) : null}
      <RightReopenStrip visible={!open && !mounted} on_click={on_open} />
    </React.Fragment>
  );
}

interface RightReopenStripProps {
  visible: boolean;
  on_click: () => void;
}

function RightReopenStrip(props: RightReopenStripProps): ReactElement {
  const { visible, on_click } = props;
  return (
    <button
      type="button"
      onClick={on_click}
      aria-label="Open inspector"
      title="Open inspector"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position: "fixed",
        top: `calc(${TOPBAR_HEIGHT_REM} + 1rem)`,
        right: "0.5rem",
        height: "8rem",
        zIndex: 20,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0) scale(1)" : "translateX(12px) scale(0.6)",
        pointerEvents: visible ? "auto" : "none",
        transition: `opacity ${ANIM_MS}ms ease-out, transform ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        transformOrigin: "right center",
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
