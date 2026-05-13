import type { ReactElement } from "react";
import { useReduceMotion } from "@/ui";

export interface RecomputeIndicatorProps {
  counter: number;
}

export function RecomputeIndicator(props: RecomputeIndicatorProps): ReactElement {
  const reduce = useReduceMotion();
  return (
    <span
      key={props.counter}
      data-testid="recompute-indicator"
      data-counter={props.counter}
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--color-mode-current-accent)",
        opacity: 0,
        flexShrink: 0,
        animation: reduce
          ? "argmap-recompute-flash 600ms ease-out"
          : "argmap-recompute-pulse 600ms var(--ease-soft)",
      }}
    />
  );
}
