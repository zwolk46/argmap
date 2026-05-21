import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "#lib/utils";

export interface ThreePaneLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  /**
   * Deprecated. Pixel-based width hints from the pre-resizable layout.
   * Kept on the prop interface so existing callers don't fail typecheck.
   * The new discrete-state layout ignores these.
   */
  left_width?: string;
  right_width?: string;
  bottom_height?: string;
}

// Discrete pane states. Drag-resize is gone; users click the chevron on the
// inner edge of a pane to cycle through narrow / default / wide. Predictable,
// no accidental tiny panes, no "is this the right size?" anxiety. Pixel
// widths are tuned to the original pre-overhaul defaults for "default" and
// to the "icon-only readable" rail for "narrow."
type PaneState = "narrow" | "default" | "wide";

const LEFT_PANE_WIDTHS: Record<PaneState, string> = {
  narrow: "56px",
  default: "256px",
  wide: "440px",
};

const RIGHT_PANE_WIDTHS: Record<PaneState, string> = {
  narrow: "56px",
  default: "360px",
  wide: "560px",
};

const STATE_CYCLE: Record<PaneState, PaneState> = {
  narrow: "default",
  default: "wide",
  wide: "narrow",
};

const PANE_STATE_LABEL: Record<PaneState, string> = {
  narrow: "narrow",
  default: "default",
  wide: "wide",
};

function usePaneState(
  storage_key: string,
  initial: PaneState = "default",
): [PaneState, () => void, (s: PaneState) => void] {
  const [state, setState] = React.useState<PaneState>(() => {
    if (typeof window === "undefined") return initial;
    const stored = window.localStorage.getItem(storage_key);
    if (stored === "narrow" || stored === "default" || stored === "wide") return stored;
    return initial;
  });

  const set = React.useCallback(
    (next: PaneState) => {
      setState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storage_key, next);
      }
    },
    [storage_key],
  );

  const cycle = React.useCallback(() => {
    setState((prev) => {
      const next = STATE_CYCLE[prev];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storage_key, next);
      }
      return next;
    });
  }, [storage_key]);

  return [state, cycle, set];
}

interface PaneToggleProps {
  side: "left" | "right";
  state: PaneState;
  on_cycle: () => void;
  label: string;
}

function PaneToggle(props: PaneToggleProps): ReactElement {
  const { side, state, on_cycle, label } = props;
  // Chevron direction depends on the side. The button is shown on the
  // pane's INNER edge (right edge of left pane / left edge of right pane).
  // The chevron points "into" the canvas when the pane is at default+,
  // and "away" from canvas when narrow (so it visually invites expansion).
  const next_label = STATE_CYCLE[state];
  // Show the chevron pointing in the direction the next click will move the
  // inner edge of this pane. For the LEFT pane: cycle narrow→default→wide
  // means the pane gets wider (its inner edge moves to the right), so
  // chevron points right. For "wide→narrow" we want it pointing left.
  const next_is_smaller = state === "wide";
  const point_right = side === "left" ? !next_is_smaller : next_is_smaller;
  const Chevron = point_right ? CaretRight : CaretLeft;

  return (
    <button
      type="button"
      onClick={on_cycle}
      aria-label={`${label} pane is ${PANE_STATE_LABEL[state]}. Click to switch to ${PANE_STATE_LABEL[next_label]}.`}
      title={`${label}: ${PANE_STATE_LABEL[state]} (click for ${PANE_STATE_LABEL[next_label]})`}
      className={cn(
        "absolute top-1/2 z-20 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        side === "left" ? "-right-2" : "-left-2",
      )}
    >
      <Chevron size={12} weight="bold" />
    </button>
  );
}

export function ThreePaneLayout(props: ThreePaneLayoutProps): ReactElement {
  const { left, center, right, bottom = null } = props;
  const [left_state, cycle_left] = usePaneState("argmap.fb.left.state.v1", "default");
  const [right_state, cycle_right] = usePaneState("argmap.fb.right.state.v1", "default");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT */}
        <aside
          className="relative shrink-0 overflow-auto border-r border-border bg-card transition-[width] duration-200 ease-out"
          style={{ width: LEFT_PANE_WIDTHS[left_state] }}
          data-pane-state={left_state}
        >
          {/* When narrow, the content inside the pane should adapt — most
              pane content scrolls horizontally below ~120px which is ugly.
              We render the children regardless and let the pane content
              clip; an explicit narrow rendering mode is a follow-up. */}
          <div className="h-full min-w-0">{left}</div>
          <PaneToggle side="left" state={left_state} on_cycle={cycle_left} label="Left pane" />
        </aside>

        {/* CENTER */}
        {/* P5: outer <main id="main"> lives in app-routes.tsx so the skip-link
            target is defined once. */}
        <div className="relative min-w-0 flex-1 overflow-hidden bg-background">{center}</div>

        {/* RIGHT */}
        <aside
          className="relative shrink-0 overflow-auto border-l border-border bg-card transition-[width] duration-200 ease-out"
          style={{ width: RIGHT_PANE_WIDTHS[right_state] }}
          data-pane-state={right_state}
        >
          <PaneToggle side="right" state={right_state} on_cycle={cycle_right} label="Right pane" />
          <div className="h-full min-w-0">{right}</div>
        </aside>
      </div>

      {bottom ? (
        <div className="shrink-0 overflow-hidden border-t border-border bg-card shadow-sm">
          {bottom}
        </div>
      ) : null}
    </div>
  );
}
