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
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
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
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
          (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = active ? "var(--color-surface-selected)" : accentBg;
        el.style.color = accentColor;
      }}
    >
      {children}
    </button>
  );
}
