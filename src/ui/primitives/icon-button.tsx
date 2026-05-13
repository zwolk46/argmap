import type { ReactElement, ReactNode } from "react";

export interface IconButtonProps {
  "aria-label": string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: "sm" | "md";
  variant?: "ghost" | "subtle" | "accent";
  children: ReactNode;
  title?: string;
  "data-testid"?: string;
}

export function IconButton({
  "aria-label": ariaLabel,
  onClick,
  disabled,
  active,
  size = "md",
  variant = "ghost",
  children,
  title,
  "data-testid": dataTestId,
}: IconButtonProps): ReactElement {
  const dim = size === "sm" ? "26px" : "32px";
  const accentBg =
    variant === "accent"
      ? "var(--color-mode-current-accent-bg)"
      : variant === "subtle"
        ? "var(--color-surface-pane)"
        : "transparent";
  const accentColor =
    variant === "accent" || active
      ? "var(--color-mode-current-accent)"
      : "var(--color-text-secondary)";
  // P1: hover is now CSS-driven via .argmap-icon-btn:hover in global.css
  // instead of inline JS mutating style on mouseenter/leave. The old
  // approach kept the hover background stuck after the cursor moved
  // away if the user happened to focus the button via Tab (mouseleave
  // never fired), and was redundant with the existing CSS transition.
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      className="argmap-icon-btn"
      data-active={active ? "true" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        border: "var(--border-thin) solid transparent",
        borderRadius: "var(--radius-md)",
        background: active ? "var(--color-surface-selected)" : accentBg,
        color: accentColor,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition:
          "background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
