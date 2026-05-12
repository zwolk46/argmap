import type { ReactElement, ReactNode } from "react";

export interface PillProps {
  children: ReactNode;
  color?: string;
  bg?: string;
  size?: "xs" | "sm";
}

export function Pill({ children, color, bg, size = "sm" }: PillProps): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "xs" ? "0 var(--space-1)" : "2px var(--space-2)",
        borderRadius: "var(--radius-pill)",
        background: bg ?? "var(--color-status-open-bg)",
        color: color ?? "var(--color-text-secondary)",
        fontSize: size === "xs" ? "var(--font-size-2xs)" : "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        fontFamily: "var(--font-sans)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
