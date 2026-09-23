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

// Pane unfolds from the right viewport edge: width grows in lockstep with
// the inner surface scaling from scaleX(0.4) → 1 with a slight overshoot
// and translating in from +40px. Entry is symmetric to exit so the pane
// slides in from the side rather than just appearing. The reopen strip
// cross-fades with the pane so there is no dead time between them.
const ANIM_MS = 280;

interface AnimatedMountState {
  mounted: boolean;
  rendered_open: boolean;
}

function useAnimatedMount(open: boolean, delay: number): AnimatedMountState {
  const [mounted, setMounted] = React.useState(open);
  const [rendered_open, setRenderedOpen] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames: first frame paints with rendered_open=false (closed
      // styles), second frame flips to true so the transition has a
      // starting state to animate from.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setRenderedOpen(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    setRenderedOpen(false);
    const t = window.setTimeout(() => setMounted(false), delay);
    return () => window.clearTimeout(t);
  }, [open, delay]);

  return { mounted, rendered_open };
}

export function RightPaneAnimated(props: RightPaneAnimatedProps): ReactElement {
  const { open, on_close, on_open, width, children } = props;
  const { mounted, rendered_open } = useAnimatedMount(open, ANIM_MS);

  return (
    <React.Fragment>
      {mounted ? (
        <aside
          data-pane="right"
          data-state={rendered_open ? "open" : "closed"}
          style={{
            width: rendered_open ? width : "0px",
            transition: `width ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
          className="shrink-0 overflow-visible p-2 data-[state=closed]:p-0"
        >
          <div
            data-state={rendered_open ? "open" : "closed"}
            style={{
              height: `calc(100svh - ${TOPBAR_HEIGHT_PX}px - 1rem)`,
              transformOrigin: "right center",
              transform: rendered_open
                ? "scaleX(1) translateX(0)"
                : "scaleX(0.4) translateX(40px)",
              opacity: rendered_open ? 1 : 0,
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
      <RightReopenStrip visible={!open} on_click={on_open} />
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
