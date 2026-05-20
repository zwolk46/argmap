import type { ReactElement, ReactNode } from "react";
import { Button as ShButton } from "#components/ui/button";
import { cn } from "#lib/utils";

export interface IconButtonProps {
  "aria-label": string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "subtle" | "accent";
  children: ReactNode;
  title?: string;
  "data-testid"?: string;
}

const SIZE_MAP = {
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
} as const;

const VARIANT_MAP = {
  ghost: "ghost",
  subtle: "outline",
  accent: "default",
} as const;

/**
 * IconButton — single-icon affordance for chrome and toolbar surfaces.
 * Wraps shadcn `Button` size="icon" so the new design system's tap target,
 * focus ring, and hover treatment apply uniformly. The previous two-layer
 * UICONS outline/solid hover crossfade is dropped in favor of Phosphor's
 * native weight variants; the `active` state is signalled via aria-pressed
 * and a muted background (group/button data-attribute) instead.
 */
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
  return (
    <ShButton
      type="button"
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      data-active={active ? "true" : undefined}
      data-argmap-variant={variant}
      data-argmap-size={size}
      className={cn(active && "bg-muted text-foreground")}
    >
      {children}
    </ShButton>
  );
}
