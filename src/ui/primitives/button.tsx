import * as React from "react";
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { Button as ShButton } from "#components/ui/button";
import { cn } from "#lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "destructive-solid";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  full_width?: boolean;
  className?: string;
}

const VARIANT_MAP: Record<ButtonVariant, React.ComponentProps<typeof ShButton>["variant"]> = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  destructive: "destructive",
  // shadcn's destructive uses a subtle bg + accent text. argmap's
  // destructive-solid wants a saturated, eye-catching CTA — render via
  // additional Tailwind classes layered on the destructive variant.
  "destructive-solid": "destructive",
};

const SIZE_MAP: Record<ButtonSize, React.ComponentProps<typeof ShButton>["size"]> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  leading,
  trailing,
  children,
  full_width,
  className,
  type,
  ...rest
}: ButtonProps): ReactElement {
  const solid =
    variant === "destructive-solid"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/80"
      : undefined;
  return (
    <ShButton
      type={type ?? "button"}
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      data-argmap-variant={variant}
      data-argmap-size={size}
      className={cn(full_width && "w-full", solid, className)}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </ShButton>
  );
}
