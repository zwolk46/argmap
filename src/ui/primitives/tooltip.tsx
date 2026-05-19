import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Z } from "./z-index";

const TooltipCtx = React.createContext<null>(null);

export function TooltipProvider(props: { children: ReactNode }): ReactElement {
  return React.createElement(TooltipCtx.Provider, { value: null }, props.children);
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  disabled?: boolean;
}

// 300ms open delay matches Mac/Linear convention — fast enough that intent
// reads as "I want this tooltip" but slow enough that flyovers don't fire
// the tooltip stream. Keyboard focus is instant (no delay) because it
// represents deliberate intent, not a hover sweep.
const TOOLTIP_OPEN_DELAY_MS = 300;

export function Tooltip({ content, children, disabled }: TooltipProps): ReactElement {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLElement>(null);
  const open_timer_ref = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // §13 #7: unique id per tooltip instance so multiple tooltips on the same
  // page don't share id="tooltip-content" (invalid HTML; SR may read the
  // first occurrence regardless of which trigger is focused).
  const tooltip_id = React.useId();

  React.useEffect(() => {
    return () => {
      if (open_timer_ref.current !== null) clearTimeout(open_timer_ref.current);
    };
  }, []);

  function cancelOpen() {
    if (open_timer_ref.current !== null) {
      clearTimeout(open_timer_ref.current);
      open_timer_ref.current = null;
    }
  }

  function handleMouseEnter(e: React.MouseEvent) {
    if (disabled) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const next_pos = { x: r.left + r.width / 2, y: r.bottom + 6 };
    cancelOpen();
    open_timer_ref.current = setTimeout(() => {
      setPos(next_pos);
      setOpen(true);
      open_timer_ref.current = null;
    }, TOOLTIP_OPEN_DELAY_MS);
  }

  function handleMouseLeave() {
    cancelOpen();
    setOpen(false);
  }

  function handleFocus(e: React.FocusEvent) {
    if (disabled) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cancelOpen();
    setPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
    setOpen(true);
  }

  function handleBlur() {
    cancelOpen();
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      cancelOpen();
      setOpen(false);
    }
  }

  // P1: merge with the child's existing handlers instead of overwriting.
  // Before, wrapping `<Button onMouseEnter={...}>` in a `<Tooltip>` would
  // silently lose the button's onMouseEnter — a latent footgun the
  // moment any coachmark-on-a-primary-action came along.
  const child_props = (
    children as ReactElement<{
      onMouseEnter?: (e: React.MouseEvent) => void;
      onMouseLeave?: (e: React.MouseEvent) => void;
      onFocus?: (e: React.FocusEvent) => void;
      onBlur?: (e: React.FocusEvent) => void;
      onKeyDown?: (e: React.KeyboardEvent) => void;
    }>
  ).props;
  function compose<T extends React.SyntheticEvent>(
    own: (e: T) => void,
    childs: ((e: T) => void) | undefined,
  ) {
    return childs
      ? (e: T) => {
          childs(e);
          own(e);
        }
      : own;
  }

  const childWithProps = React.cloneElement(children, {
    onMouseEnter: compose(handleMouseEnter, child_props.onMouseEnter),
    onMouseLeave: compose(handleMouseLeave, child_props.onMouseLeave),
    onFocus: compose(handleFocus, child_props.onFocus),
    onBlur: compose(handleBlur, child_props.onBlur),
    onKeyDown: compose(handleKeyDown, child_props.onKeyDown),
    "aria-describedby": open ? tooltip_id : undefined,
    ref,
  } as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> });

  return (
    <>
      {childWithProps}
      {open && content && (
        <div
          id={tooltip_id}
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform: "translateX(-50%)",
            zIndex: Z.tooltip,
            background: "var(--color-surface-elevated)",
            boxShadow: "var(--shadow-md)",
            borderRadius: "var(--radius-md)",
            border: "var(--border-hairline) solid var(--color-border-subtle)",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            lineHeight: "var(--line-height-normal)",
            fontFamily: "var(--font-sans)",
            maxWidth: "320px",
            pointerEvents: "none",
            animation: "argmap-overlay-fade-in var(--duration-fast) var(--ease-standard)",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
