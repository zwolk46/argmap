import * as React from "react";

export type UIconStyle = "rr" | "sr" | "br";

export interface UIconProps {
  /** The fi-{style}-{name} icon name (omit the "fi-{style}-" prefix) */
  name: string;
  size?: number;
  /**
   * Icon family: "rr" = regular rounded (outline, default), "sr" = solid
   * rounded, "br" = bold rounded. All three stylesheets are loaded in
   * index.html so any family can render. `br` is reserved for the
   * canvas-node `.cn-status` header strip where the glyph stands in as a
   * headline-scale signal alongside the status word.
   */
  iconStyle?: UIconStyle;
  style?: React.CSSProperties;
  /** When set, exposes the icon name + style on a data-attribute so IconButton can detect it for the outline→solid hover cross-fade. */
  "data-icon-name"?: string;
}

export function UIcon({
  name,
  size = 16,
  iconStyle = "rr",
  style,
}: UIconProps): React.ReactElement {
  return (
    <i
      className={`fi fi-${iconStyle}-${name}`}
      aria-hidden="true"
      data-icon-name={name}
      data-icon-style={iconStyle}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block", ...style }}
    />
  );
}
