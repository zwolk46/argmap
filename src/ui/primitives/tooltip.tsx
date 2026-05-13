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

  const childWithProps = React.cloneElement(children, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    "aria-describedby": open ? "tooltip-content" : undefined,
    ref,
  });

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
