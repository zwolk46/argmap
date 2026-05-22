import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "#lib/utils";

export interface TwoPaneLayoutProps {
  left: ReactNode;
  right: ReactNode;
  bottom?: ReactNode | null;
  /**
   * Deprecated. Pre-resizable width hint. Kept on the prop interface so
   * existing callers don't fail typecheck. The discrete-state layout
   * ignores these.
   */
  left_width?: string;
  bottom_expanded_height?: string;
  /**
   * When `bottom` is supplied this prop toggles between the compact strip
   * (collapsed) and the full panel (expanded). Preserved because the
   * argument-running page's bottom panel still drives a two-state vertical
   * layout (header bar vs full panel).
   */
  bottom_expanded?: boolean;
}

type PaneState = "narrow" | "default" | "wide";

const LEFT_PANE_WIDTHS: Record<PaneState, string> = {
  narrow: "56px",
  default: "280px",
  wide: "480px",
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
): [PaneState, () => void] {
  const [state, setState] = React.useState<PaneState>(() => {
    if (typeof window === "undefined") return initial;
    const stored = window.localStorage.getItem(storage_key);
    if (stored === "narrow" || stored === "default" || stored === "wide") return stored;
    return initial;
  });
  const cycle = React.useCallback(() => {
    setState((prev) => {
      const next = STATE_CYCLE[prev];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storage_key, next);
      }
      return next;
    });
  }, [storage_key]);
  return [state, cycle];
}

interface PaneToggleProps {
  state: PaneState;
  on_cycle: () => void;
  label: string;
}

function LeftPaneToggle(props: PaneToggleProps): ReactElement {
  const { state, on_cycle, label } = props;
  const next_label = STATE_CYCLE[state];
  const next_is_smaller = state === "wide";
  const Chevron = next_is_smaller ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={on_cycle}
      aria-label={`${label} pane is ${PANE_STATE_LABEL[state]}. Click to switch to ${PANE_STATE_LABEL[next_label]}.`}
      title={`${label}: ${PANE_STATE_LABEL[state]} (click for ${PANE_STATE_LABEL[next_label]})`}
      className={cn(
        "absolute top-1/2 z-20 flex h-12 w-4 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "-right-2",
      )}
    >
      <Chevron size={12} weight="bold" />
    </button>
  );
}

export function TwoPaneLayout(props: TwoPaneLayoutProps): ReactElement {
  const { left, right, bottom = null, bottom_expanded = false } = props;
  const [left_state, cycle_left] = usePaneState("argmap.ar.left.state.v1", "default");

  return (
    <div
      data-testid="argument-running-two-pane"
      className="flex h-full flex-col overflow-hidden bg-background"
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className="group/pane relative shrink-0 overflow-auto border-r border-border bg-background transition-[width] duration-200 ease-out"
          style={{ width: LEFT_PANE_WIDTHS[left_state] }}
          data-pane-state={left_state}
        >
          {/* Narrow-mode: interview list is unreadable below ~150px, so
              we hide the content and just leave the chevron toggle visible. */}
          <div className="h-full min-w-0 group-data-[pane-state=narrow]/pane:hidden">{left}</div>
          <LeftPaneToggle state={left_state} on_cycle={cycle_left} label="Left pane" />
        </aside>

        {/* P5: outer <main id="main"> lives in app-routes.tsx so we don't
            nest <main> elements (invalid per HTML5). */}
        <div className="relative min-w-0 flex-1 overflow-hidden bg-muted/30">{right}</div>
      </div>

      {bottom != null && (
        <div
          className={cn(
            "shrink-0 overflow-hidden border-t border-border bg-background transition-[height] duration-200 ease-out",
            bottom_expanded ? "h-[260px]" : "h-8",
          )}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}
