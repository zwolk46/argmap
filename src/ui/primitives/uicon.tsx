import * as React from "react";

export type UIconStyle = "rr" | "sr";

export interface UIconProps {
  /** The fi-{style}-{name} icon name (omit the "fi-{style}-" prefix) */
  name: string;
  size?: number;
  /**
   * Icon family: "rr" = regular rounded (outline, default), "sr" = solid rounded.
   * Both stylesheets are loaded in index.html so either family can render.
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
