import * as React from "react";

export interface UIconProps {
  /** The fi-rr-{name} icon name (omit the "fi-rr-" prefix) */
  name: string;
  size?: number;
  style?: React.CSSProperties;
}

export function UIcon({ name, size = 16, style }: UIconProps): React.ReactElement {
  return (
    <i
      className={`fi fi-rr-${name}`}
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1, display: "inline-block", ...style }}
    />
  );
}
