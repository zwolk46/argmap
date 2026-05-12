import type { ReactElement, ReactNode } from "react";

export interface IconButtonProps {
  "aria-label": string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
  title?: string;
}

export function IconButton({
  "aria-label": ariaLabel,
  onClick,
  disabled,
  active,
  size = "md",
  children,
  title,
}: IconButtonProps): ReactElement {
  const dim = size === "sm" ? "28px" : "32px";
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        border: "none",
        borderRadius: "var(--radius-md)",
        background: active ? "var(--color-surface-selected)" : "transparent",
        color: active ? "var(--color-mode-current-accent)" : "var(--color-text-secondary)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: `background-color var(--duration-fast) var(--ease-standard)`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = active
          ? "var(--color-surface-selected)"
          : "transparent";
      }}
    >
      {children}
    </button>
  );
}
