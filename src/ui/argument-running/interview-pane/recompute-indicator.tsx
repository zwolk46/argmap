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
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        marginRight: 6,
        borderRadius: "50%",
        background: "var(--color-text-accent, #1d4ed8)",
        opacity: 0,
        animation: reduce
          ? "argmap-recompute-flash 600ms ease-out"
          : "argmap-recompute-pulse 600ms ease-out",
      }}
    />
  );
}
