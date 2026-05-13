import * as React from "react";
import type { ReactElement, ReactNode } from "react";

const TooltipCtx = React.createContext<null>(null);

export function TooltipProvider(props: { children: ReactNode }): ReactElement {
  return React.createElement(TooltipCtx.Provider, { value: null }, props.children);
}

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  disabled?: boolean;
}

export function Tooltip({ content, children, disabled }: TooltipProps): ReactElement {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLElement>(null);

  function handleMouseEnter(e: React.MouseEvent) {
    if (disabled) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
    setOpen(true);
  }

  function handleMouseLeave() {
    setOpen(false);
  }

  function handleFocus(e: React.FocusEvent) {
    if (disabled) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
    setOpen(true);
  }

  function handleBlur() {
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
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
    "aria-describedby": open ? "tooltip-content" : undefined,
    ref,
  } as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> });

  return (
    <>
      {childWithProps}
      {open && content && (
        <div
          id="tooltip-content"
          role="tooltip"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            transform: "translateX(-50%)",
            zIndex: 9999,
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
