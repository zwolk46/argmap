import * as React from "react";
import type { ReactElement, ReactNode } from "react";

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

/**
 * IconButton renders a two-layer outline/solid stack so hover crossfades
 * from the regular-rounded UICONS outline to the solid-rounded variant
 * with elastic motion. The cross-fade is CSS-driven via .argmap-icon-btn
 * in global.css; this component's job is to project a solid sibling when
 * the child icon is a <UIcon name="..." iconStyle="rr" /> we can detect.
 *
 * Children that aren't a single detectable UIcon (raw SVG, multi-element
 * trees, plain text) fall through with a scale-only hover treatment.
 */
function findUIconName(children: ReactNode): { name: string; size: number } | null {
  const list = React.Children.toArray(children);
  if (list.length !== 1) return null;
  const only = list[0];
  if (!React.isValidElement(only)) return null;
  const props = only.props as { name?: unknown; size?: unknown; iconStyle?: unknown };
  // We only swap when the inner UIcon is in the "rr" family (or unspecified, which defaults to rr).
  const iconStyle = props.iconStyle;
  if (iconStyle !== undefined && iconStyle !== "rr") return null;
  if (typeof props.name !== "string") return null;
  const size = typeof props.size === "number" ? props.size : 16;
  return { name: props.name, size };
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
  const detected = findUIconName(children);

  const inner = detected ? (
    <span className="argmap-icon-btn-stack" data-has-solid="true">
      <span className="argmap-icon-btn-layer" data-layer="outline">
        {children}
      </span>
      <span className="argmap-icon-btn-layer" data-layer="solid" aria-hidden="true">
        <i
          className={`fi fi-sr-${detected.name}`}
          aria-hidden="true"
          style={{
            fontSize: detected.size,
            lineHeight: 1,
            display: "inline-block",
          }}
        />
      </span>
    </span>
  ) : (
    <span className="argmap-icon-btn-stack">{children}</span>
  );

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
      data-size={size === "md" ? undefined : size}
      data-variant={variant === "ghost" ? undefined : variant}
    >
      {inner}
    </button>
  );
}
