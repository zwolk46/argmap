import * as React from "react";
import type { ReactElement, RefObject } from "react";
import { Z } from "../primitives";
import { Button } from "#components/ui/button";

export interface CoachmarkProps {
  anchor_ref: RefObject<HTMLElement | null>;
  message: string;
  on_dismiss: () => void;
  on_learn_more?: () => void;
}

export function Coachmark(props: CoachmarkProps): ReactElement | null {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    const el = props.anchor_ref.current;
    if (!el) return;
    let raf_id: number | null = null;
    const reposition = (): void => {
      if (raf_id !== null) return;
      raf_id = requestAnimationFrame(() => {
        raf_id = null;
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.bottom + 12, left: rect.left });
      });
    };
    reposition();
    // Reposition when the anchor (or its ancestors) resize, when the window
    // resizes, or when the page scrolls. Without these the popover sticks
    // to its mount-time coords while the anchor moves around it.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    return () => {
      if (raf_id !== null) cancelAnimationFrame(raf_id);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, { capture: true } as EventListenerOptions);
    };
  }, [props.anchor_ref]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") props.on_dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [props]);

  // §13 #10: autofocus the dismiss button on mount so keyboard users land
  // in the coachmark instead of needing to Tab from the page background.
  // Also surface a unique aria-label that includes the message, so
  // screen-reader users hear what the coachmark is about (not just
  // "Coachmark").

  if (!pos) return null;
  const aria_label = props.message ? `Coachmark: ${props.message}` : "Coachmark";
  return (
    <div
      data-testid="coachmark"
      role="dialog"
      aria-modal="true"
      aria-label={aria_label}
      // Position is runtime-computed; keep inline style for it.
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: Z.coachmark }}
      className="max-w-[320px] rounded-2xl bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10 shadow-md"
    >
      <p className="m-0 text-sm text-[var(--color-text-primary)]">{props.message}</p>
      <div className="mt-2 flex justify-end gap-2">
        {props.on_learn_more ? (
          <Button
            variant="ghost"
            size="sm"
            data-testid="coachmark-learn-more"
            onClick={props.on_learn_more}
          >
            Learn more
          </Button>
        ) : null}
        <Button
          variant="default"
          size="sm"
          data-testid="coachmark-dismiss"
          autoFocus
          onClick={props.on_dismiss}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
