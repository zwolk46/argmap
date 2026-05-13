import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

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
  const cls = ["argmap-btn", className].filter(Boolean).join(" ");
  return (
    <button
      type={type ?? "button"}
      data-variant={variant}
      data-size={size}
      className={cls}
      style={full_width ? { width: "100%" } : undefined}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
